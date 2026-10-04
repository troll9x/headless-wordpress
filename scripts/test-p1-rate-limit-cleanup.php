<?php
declare(strict_types=1);

namespace {
	define( 'ABSPATH', __DIR__ );
	class WP_REST_Request {}
	class FakeWpdb {
		public string $options = 'wp_options';
		public int $calls = 0;
		public function esc_like( string $text ): string { return $text; }
		public function prepare( string $query, ...$args ): string { return vsprintf( str_replace( [ '%s', '%d' ], [ "'%s'", '%d' ], $query ), $args ); }
		public function get_col( string $query ): array {
			$this->calls++;
			return 1 === $this->calls ? [ 'tlu_rl_exp_' . str_repeat( 'a', 40 ), 'unrelated_option' ] : [];
		}
	}
	$wpdb = new FakeWpdb();
	$GLOBALS['deleted_options'] = [];
	function delete_option( string $key ): void { $GLOBALS['deleted_options'][] = $key; }
	require __DIR__ . '/../release/headless-api/includes/Services/RateLimiter.php';
	( new \TLU_Headless_API\Services\RateLimiter() )->cleanup_expired();
	$expected = [ 'tlu_rl_' . str_repeat( 'a', 40 ), 'tlu_rl_exp_' . str_repeat( 'a', 40 ) ];
	if ( $GLOBALS['deleted_options'] !== $expected || 1 !== $wpdb->calls ) {
		throw new \RuntimeException( 'Cleanup did not delete only the expired counter pair.' );
	}
	echo "PASS: Expired rate-limit fallback pair is cleaned safely.\n";
}
