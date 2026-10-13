<?php
/** Regression: an unresolved SEO post returns WP_Error instead of fatalling. */
namespace {
	define( 'ABSPATH', __DIR__ );
	class WP_Error {
		public function __construct( public string $code, public string $message ) {}
	}
	class WP_REST_Request {
		public function get_param( string $name ) { return [ 'id' => 284, 'slug' => '', 'type' => 'page', 'lang' => 'vi' ][ $name ] ?? null; }
	}
	function is_wp_error( $value ): bool { return $value instanceof WP_Error; }
}
namespace TLU_Headless_API {
	final class Response {
		public static function bad_request( string $message ): \WP_Error { return new \WP_Error( 'bad_request', $message ); }
		public static function not_found( string $message ): \WP_Error { return new \WP_Error( 'not_found', $message ); }
		public static function success( array $data ): array { return $data; }
	}
}
namespace TLU_Headless_API\Services {
	class SeoService {
		public static string $received_lang = '';
		public function get_seo_by_id( int $id, string $lang = '' ): \WP_Error {
			self::$received_lang = $lang;
			return new \WP_Error( 'post_not_found', 'Post not found.' );
		}
	}
}
namespace {
	require __DIR__ . '/../release/headless-api/includes/endpoints/class-seo.php';
	$result = ( new \TLU_Headless_API\Endpoints\Seo() )->handle( new WP_REST_Request() );
	if ( ! $result instanceof WP_Error || 'post_not_found' !== $result->code || 'vi' !== \TLU_Headless_API\Services\SeoService::$received_lang ) {
		throw new \RuntimeException( 'SEO error propagation or language argument failed.' );
	}
	echo "CMS SEO error contract PASS\n";
}
