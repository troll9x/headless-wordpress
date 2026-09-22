<?php
declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/wordpress-stub/' );
define( 'MINUTE_IN_SECONDS', 60 );

$registered_actions = [];
$deactivated_plugins = [];
$test_transients = [];

function add_action( string $hook, $callback, int $priority = 10, int $accepted_args = 1 ): void {
	global $registered_actions;
	$registered_actions[] = compact( 'hook', 'callback', 'priority', 'accepted_args' );
}

function apply_filters( string $hook, $value, ...$args ) {
	return $value;
}

function get_option( string $key, $default = false ) {
	if ( 'active_plugins' === $key ) {
		return [
			'headless-api/headless-api.php',
			'legacy-headless-api/legacy-api.php',
		];
	}
	return $default;
}

function is_plugin_active_for_network( string $plugin ): bool {
	return false;
}

function is_multisite(): bool {
	return false;
}

function plugin_basename( string $file ): string {
	$file = str_replace( '\\', '/', $file );
	return basename( dirname( $file ) ) . '/' . basename( $file );
}

function plugin_dir_path( string $file ): string {
	return dirname( $file ) . '/';
}

function get_plugins(): array {
	return [
		'headless-api/headless-api.php' => [
			'Name'       => 'Headless API',
			'TextDomain' => 'tlu-headless-api',
		],
		'legacy-headless-api/legacy-api.php' => [
			'Name'       => 'Headless API',
			'TextDomain' => '',
		],
		'headless-api-archive/headless-api.php' => [
			'Name'       => 'Headless API',
			'TextDomain' => 'tlu-headless-api',
		],
		'acf-pro/acf.php' => [
			'Name'       => 'Advanced Custom Fields PRO',
			'TextDomain' => 'acf',
		],
	];
}

function deactivate_plugins( array $plugins, bool $silent = false, ?bool $network_wide = null ): void {
	global $deactivated_plugins;
	$deactivated_plugins = compact( 'plugins', 'silent', 'network_wide' );
}

function set_transient( string $key, $value, int $expiration = 0 ): bool {
	global $test_transients;
	$test_transients[ $key ] = $value;
	return true;
}

function get_transient( string $key ) {
	global $test_transients;
	return $test_transients[ $key ] ?? false;
}

function delete_transient( string $key ): bool {
	global $test_transients;
	unset( $test_transients[ $key ] );
	return true;
}

function esc_html( string $value ): string {
	return htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' );
}

class WP_Post {
	public string $post_type = 'post';

	public function __construct( object $data = null ) {
		if ( $data ) {
			foreach ( get_object_vars( $data ) as $key => $value ) {
				$this->{$key} = $value;
			}
		}
	}
}

class WP_Term {}

function assert_true( bool $condition, string $message ): void {
	if ( ! $condition ) {
		fwrite( STDERR, "FAIL: {$message}\n" );
		exit( 1 );
	}
	echo "PASS: {$message}\n";
}

$plugin_dir = dirname( __DIR__ ) . '/release/headless-api';

require_once $plugin_dir . '/headless-api.php';
assert_true(
	! class_exists( \TLU_Headless_API\Plugin::class, false ),
	'Duplicate bootstrap exits before loading application classes regardless of load order.'
);
assert_true(
	! defined( 'TLU_HEADLESS_API_VERSION' ),
	'Duplicate bootstrap does not claim the application version before cleanup.'
);

require_once $plugin_dir . '/includes/Contracts/NormalizerInterface.php';
require_once $plugin_dir . '/includes/Contracts/IntegrationInterface.php';
require_once $plugin_dir . '/includes/Services/UrlTransformer.php';
require_once $plugin_dir . '/includes/Normalizers/MediaNormalizer.php';
require_once $plugin_dir . '/includes/Integrations/PolylangIntegration.php';
require_once $plugin_dir . '/includes/Services/RevalidationEventBuilder.php';
require_once $plugin_dir . '/includes/Services/RevalidationQueue.php';
require_once $plugin_dir . '/includes/Services/RevalidationConfig.php';
require_once $plugin_dir . '/includes/Services/RevalidationSigner.php';
require_once $plugin_dir . '/includes/Services/RevalidationDispatcher.php';
require_once $plugin_dir . '/includes/Services/CacheVersionStore.php';
require_once $plugin_dir . '/includes/Integrations/RevalidationHooksIntegration.php';
require_once $plugin_dir . '/includes/Integrations/CacheInvalidationIntegration.php';

\TLU_Headless_API\Installer::register( $plugin_dir . '/headless-api.php' );
\TLU_Headless_API\Installer::after_plugin_activated( 'headless-api/headless-api.php', false );

assert_true(
	[ 'legacy-headless-api/legacy-api.php' ] === $deactivated_plugins['plugins'],
	'Activation deactivates a duplicate even when its main filename is different.'
);
assert_true(
	false === $deactivated_plugins['network_wide'],
	'Site activation does not deactivate network plugins.'
);

\TLU_Headless_API\Installer::render_duplicate_notice();
assert_true(
	false !== get_transient( 'tlu_headless_api_duplicate_plugins_deactivated' ),
	'Duplicate notice is retained while legacy hooks are still loaded.'
);

$revalidation = new ReflectionClass( \TLU_Headless_API\Integrations\RevalidationHooksIntegration::class );
assert_true(
	1 === $revalidation->getMethod( 'handle_option_change' )->getNumberOfRequiredParameters(),
	'deleted_option can call handle_option_change with one argument.'
);
assert_true(
	0 === $revalidation->getMethod( 'process_event' )->getNumberOfRequiredParameters(),
	'WP-Cron can call process_event without event arguments.'
);
assert_true(
	$revalidation->getMethod( 'capture_post_for_deletion' )->isPublic(),
	'before_delete_post callback is publicly callable.'
);

$revalidation_instance = $revalidation->newInstance();
$revalidation_instance->handle_option_change( 'acf_internal_option_deleted' );
assert_true( true, 'deleted_option executes with one argument without a fatal error.' );
$revalidation_instance->process_event();
assert_true( true, 'WP-Cron worker executes without scheduled arguments.' );

$cache_invalidation = new ReflectionClass( \TLU_Headless_API\Integrations\CacheInvalidationIntegration::class );
$menu_parameter = $cache_invalidation->getMethod( 'on_menu_updated' )->getParameters()[1];
assert_true(
	'array' === (string) $menu_parameter->getType() && $menu_parameter->isOptional(),
	'wp_update_nav_menu accepts the array supplied by WordPress.'
);

$cache_instance = $cache_invalidation->newInstanceWithoutConstructor();
$cache_skip = $cache_invalidation->getMethod( 'should_skip_post' );
$cache_skip->setAccessible( true );

$acf_types = [ 'acf-field-group', 'acf-field', 'acf-post-type', 'acf-taxonomy', 'acf-ui-options-page' ];
foreach ( $acf_types as $post_type ) {
	$post = new WP_Post();
	$post->post_type = $post_type;
	assert_true(
		true === $cache_skip->invoke( $cache_instance, $post ),
		"Cache invalidation skips ACF internal post type {$post_type}."
	);
}

$builder = new ReflectionClass( \TLU_Headless_API\Services\RevalidationEventBuilder::class );
$builder_instance = $builder->newInstanceWithoutConstructor();
$builder_skip = $builder->getMethod( 'is_internal_post_type' );
$builder_skip->setAccessible( true );
foreach ( $acf_types as $post_type ) {
	assert_true(
		true === $builder_skip->invoke( $builder_instance, $post_type ),
		"Revalidation skips ACF internal post type {$post_type}."
	);
}

echo "All Headless API hook compatibility tests passed.\n";
