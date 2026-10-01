<?php
declare(strict_types=1);

// Exercise the real cache classes with an in-memory WordPress transient store.
define('ABSPATH', __DIR__ . '/wordpress-stub/');
define('TLU_HEADLESS_API_NAMESPACE', 'tlu/v1');
define('HEADLESS_API_NAMESPACE', 'headless/v1');
define('TLU_HEADLESS_API_SCHEMA_VERSION', '4.7');
define('LOGGED_IN_COOKIE', 'test_logged_in');
define('AUTH_COOKIE', 'test_auth');
define('SECURE_AUTH_COOKIE', 'test_secure_auth');

$test_now = 1000;
$test_writes = 0;
$test_transients = [];
$test_generations = [];
function get_option($key, $default = false) {
    global $test_generations;
    if ($key === 'tlu_headless_options') return ['enable_cache' => true, 'frontend_url' => 'https://example.test'];
    if ($key === 'tlu_headless_api_cache_generations') return $test_generations;
    return $default;
}
function apply_filters($hook, $value, ...$args) { return $value; }
function wp_using_ext_object_cache() { return false; }
function is_user_logged_in() { return false; }
function sanitize_key($value) { return preg_replace('/[^a-z0-9_\-]/', '', strtolower($value)); }
function wp_json_encode($value) { return json_encode($value); }
function esc_url_raw($value) { return $value; }
function wp_parse_url($value, $component = -1) { return parse_url($value, $component); }
function home_url($path = '') { return 'https://cms.example.test' . $path; }
function untrailingslashit($value) { return rtrim($value, '/'); }
function get_transient($key) {
    global $test_transients, $test_now;
    $entry = $test_transients[$key] ?? null;
    return $entry && $entry['expires'] > $test_now ? $entry['value'] : false;
}
function set_transient($key, $value, $ttl = 0) {
    global $test_transients, $test_now, $test_writes;
    $test_transients[$key] = ['value' => $value, 'expires' => $test_now + $ttl];
    $test_writes++;
    return true;
}
class WP_REST_Server {}
class WP_REST_Request {
    public function __construct(private string $route = '/headless/v1/options', private array $params = ['key' => 'tlu_site_hero', 'lang' => 'vi']) {}
    public function get_route() { return $this->route; }
    public function get_method() { return 'GET'; }
    public function get_params() { return $this->params; }
    public function get_headers() { return []; }
}
class WP_REST_Response {
    private array $headers = [];
    public function __construct(private mixed $data = null, private int $status = 200) {}
    public function get_data() { return $this->data; }
    public function get_status() { return $this->status; }
    public function get_headers() { return $this->headers; }
    public function header($name, $value) { $this->headers[$name] = $value; }
}
function rest_ensure_response($value) { return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value); }
function check(bool $condition, string $message): void {
    if (!$condition) { fwrite(STDERR, "FAIL: $message\n"); exit(1); }
    echo "PASS: $message\n";
}

$base = dirname(__DIR__) . '/release/headless-api/includes/';
foreach (['class-config.php', 'Contracts/CacheInterface.php', 'Services/CorsPolicy.php', 'Services/HttpCachePolicy.php', 'Services/CacheVersionStore.php', 'Services/CacheKeyBuilder.php', 'Cache/TransientCache.php', 'Integrations/RestHttpIntegration.php'] as $file) require_once $base . $file;

use TLU_Headless_API\Integrations\RestHttpIntegration;
use TLU_Headless_API\Cache\TransientCache;

$integration = new RestHttpIntegration();
$server = new WP_REST_Server();
$request = new WP_REST_Request();
check($integration->check_cache(null, $server, $request) === null, 'Cold request reaches the endpoint.');
$payload = ['fields' => ['hero_slides_vi' => [['slide_image' => 'banner.webp']]]];
$response = new WP_REST_Response($payload);
$integration->add_validation_headers($response, $server, $request);
$integration->store_cache($response, $server, $request);
check($response->get_headers()['X-Headless-Cache'] === 'MISS' && $test_writes === 1, 'Cold response is stored once and reports MISS.');
$etag = $response->get_headers()['ETag'];
$snapshot = $test_transients;

$test_now += 100;
$hit = $integration->check_cache(null, $server, $request);
check($hit instanceof WP_REST_Response && $hit->get_data() === $payload, 'Warm request returns the cached payload.');
$integration->add_validation_headers($hit, $server, $request);
$integration->store_cache($hit, $server, $request);
check($hit->get_headers()['X-Headless-Cache'] === 'HIT', 'HIT survives the post-dispatch hooks.');
check($test_writes === 1 && $test_transients === $snapshot, 'Reading cache neither writes again nor extends its expiration.');
check($hit->get_headers()['ETag'] === $etag, 'Cached validators are preserved.');

$english = new WP_REST_Request('/headless/v1/options', ['key' => 'tlu_site_hero', 'lang' => 'en']);
check($integration->check_cache(null, $server, $english) === null, 'Vietnamese and English cache entries remain separate.');
$test_generations = ['options' => 2];
check($integration->check_cache(null, $server, $request) === null, 'An options generation change invalidates the entry.');
$test_generations = [];
$test_now = 1301;
check($integration->check_cache(null, $server, $request) === null, 'Entry expires at its original TTL despite intervening hits.');

$disabled = new RestHttpIntegration(cache: new TransientCache('test_', 300, false));
$response = new WP_REST_Response($payload);
$disabled->add_validation_headers($response, $server, $request);
$disabled->store_cache($response, $server, $request);
check($response->get_headers()['X-Headless-Cache'] === 'BYPASS' && $test_writes === 1, 'Disabled cache bypasses storage.');
$response = new WP_REST_Response(['error' => 'unavailable'], 500);
$integration->add_validation_headers($response, $server, $request);
$integration->store_cache($response, $server, $request);
check($test_writes === 1, 'Failed responses are not cached.');
