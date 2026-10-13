<?php
namespace TLU_Headless_API\Services;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use TLU_Headless_API\Config;
use TLU_Headless_API\Helpers\ContentVisibility;

/** Bridge tới WPX FULLTEXT REST API mà không thay đổi ranking hay dữ liệu kết quả. */
class SearchService {

	private const SEARCH_ROUTE  = '/wpx-ft/v1/search';
	private const SUGGEST_ROUTE = '/wpx-ft/v1/suggest';

	public function min_chars(): int {
		return max( 2, (int) apply_filters( 'headless_api_search_min_chars', 2 ) );
	}

	/** @return array|\WP_Error */
	public function search( string $query, int $per = 8, int $page = 1, string $language = '' ) {
		$per      = min( 50, max( 1, $per ) );
		$page     = max( 1, $page );
		$language = in_array( $language, [ 'vi', 'en' ], true ) ? $language : '';

		// The legacy FULLTEXT backend paginates before this plugin can inspect
		// Polylang languages. Query the CMS directly for language-scoped search.
		if ( '' !== $language ) {
			return $this->search_language( $query, $per, $page, $language );
		}

		return $this->dispatch(
			self::SEARCH_ROUTE,
			[
				'q'    => $query,
				'per'  => $per,
				'page' => $page,
				'lang' => '',
			],
			true,
			''
		);
	}

	/** @return array|\WP_Error */
	private function search_language( string $query, int $per, int $page, string $language ) {
		if ( ! function_exists( 'pll_get_post_language' ) ) {
			return new \WP_Error( 'search_language_unavailable', 'Polylang is unavailable.', [ 'status' => 503 ] );
		}

		$posts = new \WP_Query( [
			's'                   => $query,
			'post_type'           => [ 'post' ],
			'post_status'         => 'publish',
			'has_password'        => false,
			'lang'                => $language,
			'posts_per_page'      => $per,
			'paged'               => $page,
			'no_found_rows'       => false,
			'ignore_sticky_posts' => true,
			'suppress_filters'    => false,
		] );

		$items = [];
		foreach ( $posts->posts as $post ) {
			// Fail closed if another query/filter has changed the language or
			// visibility after SQL pagination, rather than returning false totals.
			if (
				! $post instanceof \WP_Post
				|| ! ContentVisibility::is_post_public( $post )
				|| (string) pll_get_post_language( $post->ID, 'slug' ) !== $language
			) {
				return new \WP_Error( 'search_query_mismatch', 'Search query returned an invalid result.', [ 'status' => 503 ] );
			}

			$items[] = [
				'id'       => (int) $post->ID,
				'title'    => get_the_title( $post ),
				'url'      => 'post' === $post->post_type ? CanonicalUrlBuilder::post_path( $post ) : get_permalink( $post ),
				'type'     => $post->post_type,
				'excerpt'  => wp_trim_words( wp_strip_all_tags( $post->post_excerpt ?: $post->post_content ), 30 ),
				'thumb'    => get_the_post_thumbnail_url( $post, 'thumbnail' ) ?: '',
				'language' => $language,
			];
		}

		return [
			'items'       => $items,
			'total'       => (int) $posts->found_posts,
			'total_pages' => (int) $posts->max_num_pages,
			'page'        => $page,
			'per'         => $per,
			'per_page'    => $per,
		];
	}

	/** @return array|\WP_Error */
	public function suggest( string $query ) {
		return $this->dispatch( self::SUGGEST_ROUTE, [ 'q' => $query ], false );
	}

	/**
	 * Gọi route nội bộ để không phụ thuộc DNS, TLS hay CORS.
	 * Không sort, map URL hoặc sửa item do backend FULLTEXT trả về.
	 *
	 * @return array|\WP_Error
	 */
	private function dispatch( string $route, array $params, bool $paginated, string $language = '' ) {
		if ( ! isset( rest_get_server()->get_routes()[ $route ] ) ) {
			return $this->dispatch_remote( $route, $params, $paginated );
		}

		$request = new \WP_REST_Request( 'GET', $route );
		$request->set_query_params( $params );
		$response = rest_do_request( $request );

		if ( $response->is_error() || $response->get_status() >= 400 ) {
			return new \WP_Error(
				'search_backend_error',
				'FULLTEXT search backend returned an error.',
				[
					'status'         => 502,
					'backend_status' => $response->get_status(),
					'backend_data'   => $response->get_data(),
				]
			);
		}

		return $this->validate_data( $response->get_data(), $paginated, $language );
	}

	/** @return array|\WP_Error */
	private function dispatch_remote( string $route, array $params, bool $paginated ) {
		$endpoint = str_ends_with( $route, '/suggest' ) ? '/suggest' : '/search';
		$url      = add_query_arg( $params, Config::search_backend_url() . $endpoint );
		$response = wp_safe_remote_get( $url, [
			'timeout'            => 8,
			'redirection'         => 2,
			'reject_unsafe_urls'  => true,
			'headers'             => [ 'Accept' => 'application/json' ],
		] );

		if ( is_wp_error( $response ) ) {
			return new \WP_Error(
				'search_backend_unavailable',
				'Unable to connect to the FULLTEXT search backend.',
				[ 'status' => 503, 'backend_error' => $response->get_error_code() ]
			);
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		if ( $status < 200 || $status >= 300 ) {
			return new \WP_Error(
				'search_backend_error',
				'FULLTEXT search backend returned an error.',
				[ 'status' => 502, 'backend_status' => $status ]
			);
		}

		$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		return $this->validate_data( $data, $paginated, (string) ( $params['lang'] ?? '' ) );
	}

	/** @return array|\WP_Error */
	private function validate_data( $data, bool $paginated, string $language = '' ) {
		if ( ! is_array( $data ) || ! isset( $data['items'] ) || ! is_array( $data['items'] ) ) {
			return new \WP_Error(
				'invalid_search_backend_response',
				'FULLTEXT search backend returned an invalid response.',
				[ 'status' => 502 ]
			);
		}

		if ( $paginated && ( ! isset( $data['page'], $data['per'] ) ) ) {
			return new \WP_Error(
				'invalid_search_backend_response',
				'FULLTEXT search backend omitted pagination metadata.',
				[ 'status' => 502 ]
			);
		}

		// Both public endpoints must fail closed: items without a public post ID
		// are not safe to expose, including autocomplete suggestions.
		$data['items'] = $this->filter_public_results( $data['items'], $language );

		return $data;
	}

	/**
	 * Filters search results to ensure only public content is returned.
	 *
	 * @param array $items
	 * @return array
	 */
	private function filter_public_results( array $items, string $language = '' ): array {
		$public = [];

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$post_id = $this->get_result_post_id( $item );

			if ( $post_id <= 0 ) {
				continue;
			}

			if ( ! function_exists( '\get_post' ) ) {
				$public[] = $item;
				continue;
			}

			$post = \get_post( $post_id );

			if (
				! $post instanceof \WP_Post
				|| ! ContentVisibility::is_post_public( $post )
			) {
				continue;
			}

			if ( '' !== $language && function_exists( 'pll_get_post_language' ) ) {
				$post_language = (string) pll_get_post_language( $post->ID, 'slug' );
				if ( $post_language !== $language ) {
					continue;
				}
			}

			// Search result URLs are a frontend contract. Do not expose the
			// WordPress permalink because Permalink Manager Pro may generate it.
			if ( 'post' === $post->post_type ) {
				$post_language = function_exists( 'pll_get_post_language' )
					? (string) pll_get_post_language( $post->ID, 'slug' )
					: 'vi';
				$item['url'] = CanonicalUrlBuilder::post_path( $post );
				$item['language'] = $post_language;
			}

			$public[] = $item;
		}

		return $public;
	}

	/**
	 * Resolve post ID from various possible keys in the backend response.
	 *
	 * @param array $result
	 * @return int Post ID or 0 if not found.
	 */
	private function get_result_post_id( array $result ): int {
		foreach ( [ 'id', 'ID', 'post_id', 'object_id' ] as $key ) {
			if ( ! array_key_exists( $key, $result ) ) {
				continue;
			}

			$value = $result[ $key ];

			if ( is_int( $value ) && $value > 0 ) {
				return $value;
			}

			if (
				is_string( $value )
				&& '' !== $value
				&& ctype_digit( $value )
			) {
				return (int) $value;
			}
		}

		return 0;
	}
}
