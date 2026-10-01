<?php
declare(strict_types=1);

namespace {
	define( 'ABSPATH', __DIR__ );
	define( 'HEADLESS_API_NAMESPACE', 'headless/v1' );
	define( 'TLU_HEADLESS_API_NAMESPACE', 'tlu/v1' );

	final class WP_REST_Server {
		public const READABLE = 'GET';
	}

	final class WP_REST_Request {
		public function __construct( private array $params = [] ) {}
		public function get_param( string $name ) {
			return $this->params[ $name ] ?? null;
		}
	}

	final class WP_Post {
		public function __construct(
			public int $ID,
			public string $post_name,
			public string $post_title
		) {}
	}

	$GLOBALS['priority_test_query_args'] = [];
	$GLOBALS['priority_test_meta'] = [
		56849 => [
			'post_priority_label'       => 'hot',
			'post_priority_order'       => '1',
			'post_priority_expire_date' => '2026-12-31',
		],
		56850 => [
			'_priority_label'  => 'new',
			'_priority_order'  => '2',
			'_priority_expire' => '',
		],
		56851 => [
			'post_priority_label' => 'invalid',
			'post_priority_order' => '3',
		],
	];

	final class WP_Query {
		public array $posts;
		public function __construct( array $args ) {
			$GLOBALS['priority_test_query_args'] = $args;
			$this->posts = [
				new WP_Post( 56850, 'second-post', 'Second post' ),
				new WP_Post( 56851, 'invalid-post', 'Invalid post' ),
				new WP_Post( 56849, 'pinned-post', 'Pinned post' ),
			];
		}
	}

	function register_rest_route( string $namespace, string $route, array $args ): void {}
	function sanitize_key( string $value ): string { return strtolower( preg_replace( '/[^a-z0-9_-]/', '', $value ) ?? '' ); }
	function absint( $value ): int { return abs( (int) $value ); }
	function get_post_meta( int $post_id, string $key, bool $single = true ) { return $GLOBALS['priority_test_meta'][ $post_id ][ $key ] ?? ''; }
	function get_the_title( WP_Post $post ): string { return $post->post_title; }
	function get_permalink( WP_Post $post ): string { return 'https://cms.tlu.edu.vn/' . $post->post_name . '-' . $post->ID . '/'; }
	function wp_strip_all_tags( string $value ): string { return strip_tags( $value ); }
	function sanitize_text_field( string $value ): string { return trim( $value ); }
}

namespace TLU_Headless_API {
	final class Response {
		public static function success( $data, int $status = 200 ): array {
			return [ 'status' => $status, 'data' => $data ];
		}
	}
}

namespace {
	require_once __DIR__ . '/../release/headless-api/includes/endpoints/class-priority-posts.php';

	$endpoint = new \TLU_Headless_API\Endpoints\Priority_Posts();
	$result = $endpoint->handle( new WP_REST_Request( [ 'lang' => 'vi' ] ) );
	$items = $result['data']['items'] ?? [];

	$assertions = [
		'HTTP success'              => 200 === ( $result['status'] ?? 0 ),
		'Only valid labels exposed' => 2 === count( $items ),
		'Priority order sorted'      => 56849 === ( $items[0]['id'] ?? 0 ) && 56850 === ( $items[1]['id'] ?? 0 ),
		'Primary keys supported'     => 'hot' === ( $items[0]['label'] ?? '' ),
		'Legacy keys supported'      => 'new' === ( $items[1]['label'] ?? '' ),
		'Polylang argument passed'   => 'vi' === ( $GLOBALS['priority_test_query_args']['lang'] ?? '' ),
	];

	$failed = array_keys( array_filter( $assertions, static fn( bool $passed ): bool => ! $passed ) );
	if ( $failed ) {
		fwrite( STDERR, "FAILED: " . implode( ', ', $failed ) . PHP_EOL );
		exit( 1 );
	}

	echo 'Priority posts endpoint tests passed (' . count( $assertions ) . ' assertions).' . PHP_EOL;
}
