<?php
declare(strict_types=1);

namespace {
	define( 'ABSPATH', __DIR__ );
	define( 'TLU_HEADLESS_SEARCH_PROXY_SECRET', 'test-only-32-character-long-search-key' );
	class WP_REST_Request {
		public function __construct( private array $headers = [] ) {}
		public function get_header( string $name ): string { return $this->headers[ $name ] ?? ''; }
	}
}

namespace TLU_Headless_API\Services {
	class SearchService {}
	class RateLimiter {}
}

namespace {
	require __DIR__ . '/../release/headless-api/includes/endpoints/class-search.php';
	$secret = TLU_HEADLESS_SEARCH_PROXY_SECRET;
	$client = hash_hmac( 'sha256', 'search-ip:192.0.2.10', $secret );
	$timestamp = (string) time();
	$signature = hash_hmac( 'sha256', 'search-client:' . $timestamp . ':' . $client, $secret );
	$method = new \ReflectionMethod( \TLU_Headless_API\Endpoints\Search::class, 'verified_proxy_identity' );
	$search = new \TLU_Headless_API\Endpoints\Search();
	$headers = [
		'x-headless-search-client' => $client,
		'x-headless-search-timestamp' => $timestamp,
		'x-headless-search-signature' => $signature,
	];
	$valid = $method->invoke( $search, new WP_REST_Request( $headers ) );
	if ( 'proxy:' . $client !== $valid ) { throw new \RuntimeException( 'Valid proxy signature rejected.' ); }
	$headers['x-headless-search-signature'] = str_repeat( '0', 64 );
	if ( null !== $method->invoke( $search, new WP_REST_Request( $headers ) ) ) { throw new \RuntimeException( 'Forged proxy signature accepted.' ); }
	$headers['x-headless-search-timestamp'] = (string) ( time() - 120 );
	if ( null !== $method->invoke( $search, new WP_REST_Request( $headers ) ) ) { throw new \RuntimeException( 'Expired proxy signature accepted.' ); }
	echo "PASS: Search proxy HMAC identity validation.\n";
}
