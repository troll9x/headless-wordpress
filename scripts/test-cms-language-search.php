<?php
/** Standalone contract test for language filtering before pagination. */
namespace {
	define( 'ABSPATH', __DIR__ );
	define( 'HEADLESS_API_NAMESPACE', 'headless/v1' );

	class WP_Error {
		public function __construct( public string $code, public string $message, public array $data = [] ) {}
	}
	class WP_REST_Request {
		public function __construct( private array $params = [] ) {}
		public function get_param( string $name ) { return $this->params[ $name ] ?? null; }
		public function has_param( string $name ): bool { return array_key_exists( $name, $this->params ); }
		public function get_header( string $name ): string { return ''; }
	}
	class WP_REST_Response {}
	class WP_REST_Server { public const READABLE = 'GET'; }

	class WP_Post {
		public function __construct(
			public int $ID,
			public string $post_type,
			public string $language,
			public string $post_status = 'publish',
			public string $post_password = '',
			public string $post_excerpt = '',
			public string $post_content = ''
		) {}
	}

	class WP_Query {
		public static array $fixture = [];
		public static array $last_args = [];
		public static bool $inject_wrong_language = false;
		public array $posts = [];
		public int $found_posts = 0;
		public int $max_num_pages = 0;

		public function __construct( array $args ) {
			self::$last_args = $args;
			$matches = array_values( array_filter( self::$fixture, static fn( WP_Post $post ) =>
				$post->language === $args['lang']
				&& 'publish' === $post->post_status
				&& '' === $post->post_password
				&& in_array( $post->post_type, $args['post_type'], true )
			) );
			$this->found_posts = count( $matches );
			$this->max_num_pages = (int) ceil( $this->found_posts / $args['posts_per_page'] );
			$this->posts = array_slice( $matches, ( $args['paged'] - 1 ) * $args['posts_per_page'], $args['posts_per_page'] );
			// WordPress skips its found-rows query when LIMIT/OFFSET returns no rows.
			if ( [] === $this->posts && $args['paged'] > 1 ) {
				$this->found_posts = 0;
				$this->max_num_pages = 0;
			}
			if ( self::$inject_wrong_language ) {
				$this->posts[] = new WP_Post( 99, 'post', 'vi' );
			}
		}
	}

	function pll_get_post_language( int $id, string $field ): string {
		foreach ( WP_Query::$fixture as $post ) {
			if ( $post->ID === $id ) return $post->language;
		}
		return 'vi';
	}
	function get_the_title( WP_Post $post ): string { return 'Post ' . $post->ID; }
	function get_permalink( WP_Post $post ): string { return 'https://cms.tlu.edu.vn/en/page-' . $post->ID; }
	function wp_strip_all_tags( string $text ): string { return strip_tags( $text ); }
	function wp_trim_words( string $text, int $limit ): string { return $text; }
	function get_the_post_thumbnail_url( WP_Post $post, string $size ) { return false; }
	if ( ! function_exists( 'mb_strlen' ) ) {
		function mb_strlen( string $text ): int { return strlen( $text ); }
	}
	function apply_filters( string $name, $value ) { return $value; }
	function is_wp_error( $value ): bool { return $value instanceof WP_Error; }
	$GLOBALS['registered_routes'] = [];
	function register_rest_route( string $namespace, string $route, array $args ): void {
		$GLOBALS['registered_routes'][ $route ] = $args;
	}
}

namespace TLU_Headless_API {
	final class Response {
		public static function success( array $result ): array { return $result; }
		public static function bad_request( string $message ): \WP_Error { return new \WP_Error( 'bad_request', $message ); }
	}
}

namespace TLU_Headless_API\Helpers {
	final class ContentVisibility {
		public static function is_post_public( \WP_Post $post ): bool {
			return 'publish' === $post->post_status && '' === $post->post_password;
		}
	}
}

namespace TLU_Headless_API\Services {
	class RateLimiter {
		public function consume(): array { return [ 'allowed' => true ]; }
	}
	final class CanonicalUrlBuilder {
		public static function post_path( \WP_Post $post ): string {
			return ( 'en' === $post->language ? '/en' : '' ) . '/post-' . $post->ID;
		}
	}
}

namespace {
	require __DIR__ . '/../release/headless-api/includes/Services/SearchService.php';
	require __DIR__ . '/../release/headless-api/includes/endpoints/class-search.php';

	function assert_same( $expected, $actual, string $label ): void {
		if ( $expected !== $actual ) {
			throw new \RuntimeException( $label . ': expected ' . var_export( $expected, true ) . ', got ' . var_export( $actual, true ) );
		}
	}

	WP_Query::$fixture = [
		new WP_Post( 1, 'post', 'vi' ),
		new WP_Post( 2, 'post', 'en' ),
		new WP_Post( 3, 'page', 'en' ),
		new WP_Post( 4, 'post', 'vi' ),
		new WP_Post( 5, 'post', 'en' ),
		new WP_Post( 6, 'post', 'en', 'draft' ),
		new WP_Post( 7, 'post', 'en', 'publish', 'secret' ),
	];
	$service = new \TLU_Headless_API\Services\SearchService();
	$first = $service->search( 'water', 2, 1, 'en' );
	assert_same( [ 2, 5 ], array_column( $first['items'], 'id' ), 'English first page' );
	assert_same( 2, $first['total'], 'English total' );
	assert_same( 1, $first['total_pages'], 'English total pages' );
	assert_same( [ 'post' ], WP_Query::$last_args['post_type'], 'Existing public search policy excludes pages' );
	assert_same( 'en', WP_Query::$last_args['lang'], 'Polylang query language' );
	assert_same( false, WP_Query::$last_args['has_password'], 'Password protection in query' );
	assert_same( false, WP_Query::$last_args['no_found_rows'], 'Accurate found_posts' );
	$last = $service->search( 'water', 1, 2, 'en' );
	assert_same( [ 5 ], array_column( $last['items'], 'id' ), 'English final page' );
	assert_same( 2, $last['total_pages'], 'English pages with per=1' );
	$second = $service->search( 'water', 2, 2, 'en' );
	assert_same( [], array_column( $second['items'], 'id' ), 'English page beyond final' );
	assert_same( 2, $second['page'], 'Page metadata' );
	assert_same( 2, $second['per_page'], 'Per-page metadata' );
	assert_same( 2, $second['total'], 'English out-of-range page retains total' );
	assert_same( 1, $second['total_pages'], 'English out-of-range page retains total pages' );
	$vi = $service->search( 'water', 2, 1, 'vi' );
	assert_same( [ 1, 4 ], array_column( $vi['items'], 'id' ), 'Vietnamese first page' );
	assert_same( 2, $vi['total'], 'Vietnamese total' );
	WP_Query::$inject_wrong_language = true;
	$error = $service->search( 'water', 2, 1, 'en' );
	assert_same( 'search_query_mismatch', $error->code, 'Unexpected language fails closed' );
	WP_Query::$inject_wrong_language = false;
	$endpoint = new \TLU_Headless_API\Endpoints\Search();
	$endpoint->register_routes();
	$lang_arg = $GLOBALS['registered_routes']['/search']['args']['lang'];
	assert_same( false, ( $lang_arg['validate_callback'] )( 'fr' ), 'Invalid language rejected' );
	assert_same( true, ( $lang_arg['validate_callback'] )( 'en' ), 'English accepted' );
	$alias = $endpoint->handle_search( new WP_REST_Request( [ 'q' => 'water', 'lang' => 'en', 'per' => 8, 'per_page' => 1, 'page' => 2 ] ) );
	assert_same( [ 5 ], array_column( $alias['items'], 'id' ), 'per_page alias takes precedence' );
	echo "CMS language search contract PASS\n";
}
