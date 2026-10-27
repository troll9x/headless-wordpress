<?php
/**
 * Tìm kiếm Nhanh – Local Index (VN)
 * Description: Live search cực nhanh bằng bảng index riêng (MySQL/MariaDB FULLTEXT, có cột không dấu). Tự đồng bộ khi thêm/sửa/xoá, reindex nền bằng WP-CLI hoặc WP-Cron. Có Chẩn đoán/Fix schema. Xếp hạng ưu tiên tiêu đề (exact/prefix), phrase boost (có/không dấu) + ưu tiên bài mới. Boost KHÔNG phân biệt hoa/thường.
 * Author: Son Nguyen
 */

if (!defined('ABSPATH')) exit;

class WPX_FT_LocalIndex {
    /* -------- Options / Storage -------- */
    const OPT       = 'wpx_ft_opts';
    const OPT_QUEUE = 'wpx_ft_reindex_queue';
    const OPT_STAT  = 'wpx_ft_reindex_status';

    /* -------- DB / Cron -------- */
    const TABLE     = 'wpx_ft_index';
    const CRON_HOOK = 'wpx_ft_reindex_cron';

    /* -------- Singleton -------- */
    private static $inst = null;
    public static function instance(){ return self::$inst ?? (self::$inst = new self()); }

    private $has_fulltext = null;

    private function __construct(){
        self::$inst = $this;

        register_activation_hook(__FILE__, [$this,'on_activate']);

        // Admin
        add_action('admin_menu',         [$this,'menu']);
        add_action('admin_init',         [$this,'register_settings']);

        // Admin actions (non-AJAX)
        add_action('admin_post_wpx_ft_spawn_cli',     [$this,'admin_spawn_cli']);
        add_action('admin_post_wpx_ft_start_reindex', [$this,'admin_start_reindex']);
        add_action('admin_post_wpx_ft_stop_reindex',  [$this,'admin_stop_reindex']);
        add_action('admin_post_wpx_ft_run_batch_now', [$this,'admin_run_batch_now']);
        add_action('admin_post_wpx_ft_prune',         [$this,'admin_prune']);
        add_action('admin_post_wpx_ft_fix_fulltext',  [$this,'admin_fix_fulltext']);

        // Cron worker
        add_action(self::CRON_HOOK, [$this,'cron_reindex_worker']);

        // REST
        add_action('rest_api_init',      [$this,'register_rest']);

        // FE
        add_action('wp_enqueue_scripts',[$this,'enqueue']);
        add_action('wp_footer',          [$this,'inject_js'], 9999);

        // Sync content (tự đồng bộ)
        add_action('save_post',              [$this,'on_save_post'], 10, 3);
        add_action('deleted_post',           [$this,'on_deleted_post']);
        add_action('trashed_post',           [$this,'on_deleted_post']);
        add_action('transition_post_status', [$this,'on_transition'], 10, 3);
    }

    /* ================= Kích hoạt ================= */
    public function on_activate(){
        $this->ensure_table(); // tạo bảng + FULLTEXT 5 cột nếu thiếu
        delete_transient('wpx_ft_hasindex');
    }

    /* ================= Tuỳ chọn & Trang quản trị ================= */
    private function opts(){
        $def = [
            'post_types'      => 'post,page',
            'hijack_flatsome' => 1,
            'min_chars'       => 2,
            'limit'           => 8,
            'show_thumb'      => 1,
            'thumb_size'      => 'thumbnail',
            'show_excerpt'    => 1,
            'excerpt_words'   => 24,
            'show_view_all'   => 1,
            'view_all_text'   => 'Xem tất cả kết quả',
            'recency_days'    => 45,
            'synonyms'        => "đh,đại học,uni,university\nwp,wordpress\nseo,search engine optimization",
            'content_words'   => 400,
        ];
        $o = get_option(self::OPT, []);
        return array_merge($def, is_array($o)?$o:[]);
    }
    public function post_types(){
        $arr = array_filter(array_map('sanitize_key', array_map('trim', explode(',', (string)$this->opts()['post_types']))));
        return $arr ?: ['post','page'];
    }
    public function menu(){
        add_options_page('Tìm kiếm Nhanh (Local Index)','Tìm kiếm Nhanh','manage_options','wpx-ft-local',[$this,'admin_page']);
    }
    public function register_settings(){
        register_setting('wpx_ft_group', self::OPT, [$this,'sanitize']);
    }
    public function sanitize($in){
        $out = [];
        $out['post_types']      = sanitize_text_field($in['post_types'] ?? 'post,page');
        $out['hijack_flatsome'] = !empty($in['hijack_flatsome']) ? 1 : 0;
        $out['min_chars']       = max(1, (int)($in['min_chars'] ?? 2));
        $out['limit']           = min(20, max(3, (int)($in['limit'] ?? 8)));
        $out['show_thumb']      = !empty($in['show_thumb']) ? 1 : 0;
        $out['thumb_size']      = preg_replace('/[^a-zA-Z0-9_\-]/','', $in['thumb_size'] ?? 'thumbnail');
        $out['show_excerpt']    = !empty($in['show_excerpt']) ? 1 : 0;
        $out['excerpt_words']   = min(80, max(5, (int)($in['excerpt_words'] ?? 24)));
        $out['show_view_all']   = !empty($in['show_view_all']) ? 1 : 0;
        $out['view_all_text']   = sanitize_text_field($in['view_all_text'] ?? 'Xem tất cả kết quả');
        $out['recency_days']    = min(120, max(0, (int)($in['recency_days'] ?? 45)));
        $out['content_words']   = min(2000, max(100, (int)($in['content_words'] ?? 400)));
        $lines = array_filter(array_map('trim', preg_split('/\r\n|\n|\r/', (string)($in['synonyms'] ?? ''))));
        $out['synonyms'] = implode("\n", $lines);
        return $out;
    }

    public function admin_page(){
        $o = $this->opts();
        $stat = get_option(self::OPT_STAT, []);
        $diag = $this->diag_info(); ?>
        <div class="wrap">
            <h1>Tìm kiếm Nhanh – Local Index</h1>

            <form method="post" action="options.php" style="margin-bottom:24px;">
                <?php settings_fields('wpx_ft_group'); ?>
                <table class="form-table">
                    <tr><th>Post type lập chỉ mục</th><td>
                        <input type="text" name="<?php echo esc_attr(self::OPT); ?>[post_types]"
                               value="<?php echo esc_attr($o['post_types']); ?>" class="regular-text">
                        <p class="description">VD: <code>post,page,tin-tuc</code></p></td></tr>

                    <tr><th>Bật Live Search (Flatsome)</th><td>
                        <label><input type="checkbox" name="<?php echo esc_attr(self::OPT); ?>[hijack_flatsome]" value="1" <?php checked(!empty($o['hijack_flatsome'])); ?>> Kích hoạt</label></td></tr>

                    <tr><th>Số ký tự tối thiểu để gợi ý</th><td><input type="number" min="1" name="<?php echo esc_attr(self::OPT); ?>[min_chars]" value="<?php echo (int)$o['min_chars']; ?>"></td></tr>

                    <tr><th>Số kết quả hiển thị</th><td><input type="number" min="3" max="20" name="<?php echo esc_attr(self::OPT); ?>[limit]" value="<?php echo (int)$o['limit']; ?>"></td></tr>

                    <tr><th colspan="2"><hr><h2 style="margin:0">Hiển thị</h2></th></tr>
                    <tr><th>Hình đại diện (thumbnail)</th><td>
                        <label><input type="checkbox" name="<?php echo esc_attr(self::OPT); ?>[show_thumb]" value="1" <?php checked(!empty($o['show_thumb'])); ?>> Hiển thị</label>
                        &nbsp; Kích thước: <input type="text" name="<?php echo esc_attr(self::OPT); ?>[thumb_size]"
                        value="<?php echo esc_attr($o['thumb_size']); ?>" style="max-width:160px"></td></tr>

                    <tr><th>Trích đoạn</th><td>
                        <label><input type="checkbox" name="<?php echo esc_attr(self::OPT); ?>[show_excerpt]" value="1" <?php checked(!empty($o['show_excerpt'])); ?>> Hiển thị</label>
                        &nbsp; Giới hạn: <input type="number" min="5" max="80" name="<?php echo esc_attr(self::OPT); ?>[excerpt_words]" value="<?php echo (int)$o['excerpt_words']; ?>"> từ</td></tr>

                    <tr><th>Nút “Xem tất cả”</th><td>
                        <label><input type="checkbox" name="<?php echo esc_attr(self::OPT); ?>[show_view_all]" value="1" <?php checked(!empty($o['show_view_all'])); ?>> Hiển thị</label>
                        &nbsp; Nội dung nút: <input type="text" name="<?php echo esc_attr(self::OPT); ?>[view_all_text]" value="<?php echo esc_attr($o['view_all_text']); ?>" style="max-width:260px"></td></tr>

                    <tr><th colspan="2"><hr><h2 style="margin:0">Thông minh</h2></th></tr>
                    <tr><th>Ưu tiên bài mới (số ngày)</th><td><input type="number" min="0" max="120" name="<?php echo esc_attr(self::OPT); ?>[recency_days]" value="<?php echo (int)$o['recency_days']; ?>"></td></tr>

                    <tr><th>Từ đồng nghĩa</th><td>
                        <textarea name="<?php echo esc_attr(self::OPT); ?>[synonyms]" rows="5" style="width:100%"><?php echo esc_textarea($o['synonyms']); ?></textarea></td></tr>

                    <tr><th>Giới hạn nội dung được index</th><td>
                        <input type="number" min="100" max="2000" name="<?php echo esc_attr(self::OPT); ?>[content_words]" value="<?php echo (int)$o['content_words']; ?>"> từ
                        <p class="description">Giảm dung lượng DB nếu bài rất dài.</p>
                    </td></tr>
                </table>
                <?php submit_button('Lưu cài đặt'); ?>
            </form>

            <h2>Reindex bằng WP-CLI (chạy nền, không AJAX)</h2>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;margin-right:8px;">
                <input type="hidden" name="action" value="wpx_ft_spawn_cli">
                <?php wp_nonce_field('wpx_ft_spawn_cli'); ?>
                <button class="button button-primary" <?php disabled(!empty($stat['running'])); ?>>
                    <?php echo !empty($stat['running']) ? 'Đang chạy…' : 'Chạy WP-CLI nền'; ?>
                </button>
            </form>

            <h2 style="margin-top:24px">Reindex nền bằng WP-Cron (dự phòng)</h2>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;margin-right:8px;">
                <input type="hidden" name="action" value="wpx_ft_start_reindex">
                <?php wp_nonce_field('wpx_ft_bg_reindex'); ?>
                <button class="button" <?php disabled(!empty($stat['running'])); ?>>Bắt đầu lập chỉ mục nền</button>
            </form>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;margin-right:8px;">
                <input type="hidden" name="action" value="wpx_ft_start_reindex">
                <input type="hidden" name="fresh" value="1">
                <?php wp_nonce_field('wpx_ft_bg_reindex'); ?>
                <button class="button button-secondary" <?php disabled(!empty($stat['running'])); ?>>Làm mới toàn bộ (TRUNCATE)</button>
            </form>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;margin-right:8px;">
                <input type="hidden" name="action" value="wpx_ft_prune">
                <?php wp_nonce_field('wpx_ft_prune'); ?>
                <button class="button">Dọn bản ghi thừa</button>
            </form>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;">
                <input type="hidden" name="action" value="wpx_ft_run_batch_now">
                <?php wp_nonce_field('wpx_ft_bg_reindex'); ?>
                <button class="button">Chạy một lượt ngay</button>
            </form>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline-block;margin-left:8px;">
                <input type="hidden" name="action" value="wpx_ft_stop_reindex">
                <?php wp_nonce_field('wpx_ft_bg_reindex'); ?>
                <button class="button" <?php disabled(empty($stat['running'])); ?>>Dừng</button>
            </form>

            <div style="margin-top:12px">
                <strong>Tiến độ:</strong>
                <?php
                    $total = (int)($stat['total'] ?? 0);
                    $done  = (int)($stat['done'] ?? 0);
                    $mode  = isset($stat['mode']) ? $stat['mode'] : '—';
                    $pct   = ($total>0) ? min(100, round($done*100/($total?:1))) : 0;
                    echo esc_html($total>0 ? "{$done} / {$total} ({$pct}%) • chế độ: {$mode}" : (empty($stat['running']) ? 'Chưa chạy' : "Đang khởi tạo • chế độ: {$mode}"));
                    if (!empty($stat['finished'])) echo ' – <span style="color:green">Hoàn tất</span>';
                    if (!empty($stat['running']))  echo ' – <span style="color:#d9822b">Đang chạy</span>';
                    if (!empty($stat['fresh']))    echo ' – <span>Đang làm mới</span>';
                ?>
            </div>

            <hr>
            <h2>Chẩn đoán (không cần phpMyAdmin)</h2>
            <table class="widefat striped" style="max-width:900px">
                <tbody>
                    <tr><td style="width:240px">Tên bảng</td><td><code><?php echo esc_html($diag['t']); ?></code></td></tr>
                    <tr><td>Bảng đã tồn tại?</td><td><?php echo $diag['exists'] ? '<span style="color:green">Có</span>' : '<span style="color:red">Không</span>'; ?></td></tr>
                    <tr><td>Số dòng đã lập chỉ mục</td><td><?php echo (int)$diag['rows']; ?></td></tr>
                    <tr><td>Các post_type trong bảng</td><td><?php echo $diag['types'] ? esc_html(implode(', ', $diag['types'])) : '—'; ?></td></tr>
                    <tr><td>Có cột <code>plain</code>?</td><td><?php echo $diag['hasPlain'] ? '<span style="color:green">Có</span>' : '<span style="color:red">Không</span>'; ?></td></tr>
                    <tr><td>Chỉ mục FULLTEXT</td><td>
                        <?php if ($diag['ft']) { foreach($diag['ft'] as $k=>$v){ echo '<div><code>'.esc_html($k).'</code> : '.esc_html($v).'</div>'; } } else { echo '—'; } ?>
                    </td></tr>
                </tbody>
            </table>

            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin-top:10px;">
                <input type="hidden" name="action" value="wpx_ft_fix_fulltext">
                <?php wp_nonce_field('wpx_ft_fix_fulltext'); ?>
                <button class="button button-primary">Sửa FULLTEXT (thêm cột “plain” & tạo lại chỉ mục)</button>
            </form>
            <?php if (isset($_GET['fixed'])) {
                echo ($_GET['fixed']=='1')
                    ? '<p style="color:green;margin-top:8px">Đã sửa schema. Hãy bấm “Làm mới toàn bộ (TRUNCATE)” để lập chỉ mục lại.</p>'
                    : '<p style="color:red;margin-top:8px">Sửa schema thất bại. Kiểm tra quyền DB hoặc liên hệ hosting.</p>';
            } ?>
            <p style="margin-top:6px">Sau khi sửa, nhớ chạy <strong>Làm mới toàn bộ (TRUNCATE)</strong>.</p>
        </div>
        <?php
    }

    /* ================= REST ================= */
    public function register_rest(){
        register_rest_route('wpx-ft/v1','/search',[
            'methods'  => 'GET',
            'callback' => [$this,'rest_search'],
            'permission_callback' => '__return_true'
        ]);
        register_rest_route('wpx-ft/v1','/suggest',[
            'methods'  => 'GET',
            'callback' => [$this,'rest_suggest'],
            'permission_callback' => '__return_true'
        ]);
    }

    /* ================= Helpers ================= */
    private function table_name(){ global $wpdb; return $wpdb->prefix . self::TABLE; }

    private function has_fulltext_index(){
        if ($this->has_fulltext !== null) return $this->has_fulltext;
        global $wpdb; $t = $this->table_name();
        $cnt = (int)$wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND INDEX_TYPE='FULLTEXT'", $t
        ));
        $this->has_fulltext = $cnt > 0;
        set_transient('wpx_ft_hasindex', $this->has_fulltext ? 1 : 0, 10*MINUTE_IN_SECONDS);
        return $this->has_fulltext;
    }
    private function decode_text($s){
        $charset = get_bloginfo('charset') ?: 'UTF-8';
        $out = (string)$s;
        for ($i=0; $i<2; $i++){
            $decoded = html_entity_decode($out, ENT_QUOTES | ENT_HTML5, $charset);
            if ($decoded === $out) break; $out = $decoded;
        } return $out;
    }
    private function unaccent_vi($s){
        if (function_exists('iconv')) {
            $t = @iconv('UTF-8','ASCII//TRANSLIT//IGNORE',(string)$s);
            if ($t !== false && $t !== '') return $t;
        }
        $map = ['à'=>'a','á'=>'a','ả'=>'a','ã'=>'a','ạ'=>'a','ă'=>'a','ằ'=>'a','ắ'=>'a','ẳ'=>'a','ẵ'=>'a','ặ'=>'a','â'=>'a','ầ'=>'a','ấ'=>'a','ẩ'=>'a','ẫ'=>'a','ậ'=>'a',
            'è'=>'e','é'=>'e','ẻ'=>'e','ẽ'=>'e','ẹ'=>'e','ê'=>'e','ề'=>'e','ế'=>'e','ể'=>'e','ễ'=>'e','ệ'=>'e','ì'=>'i','í'=>'i','ỉ'=>'i','ĩ'=>'i','ị'=>'i','ò'=>'o','ó'=>'o','ỏ'=>'o','õ'=>'o','ọ'=>'o','ô'=>'o','ồ'=>'o','ố'=>'o','ổ'=>'o','ỗ'=>'o','ộ'=>'o','ơ'=>'o','ờ'=>'o','ớ'=>'o','ở'=>'o','ỡ'=>'o','ợ'=>'o',
            'ù'=>'u','ú'=>'u','ủ'=>'u','ũ'=>'u','ụ'=>'u','ư'=>'u','ừ'=>'u','ứ'=>'u','ử'=>'u','ữ'=>'u','ự'=>'u','ỳ'=>'y','ý'=>'y','ỷ'=>'y','ỹ'=>'y','ỵ'=>'y','đ'=>'d','À'=>'A','Á'=>'A','Ả'=>'A','Ã'=>'A','Ạ'=>'A','Ă'=>'A','Ằ'=>'A','Ắ'=>'A','Ẳ'=>'A','Ẵ'=>'A','Ặ'=>'A','Â'=>'A','Ầ'=>'A','Ấ'=>'A','Ẩ'=>'A','Ẫ'=>'A','Ậ'=>'A',
            'È'=>'E','É'=>'E','Ẻ'=>'E','Ẽ'=>'E','Ẹ'=>'E','Ê'=>'E','Ề'=>'E','Ế'=>'E','Ể'=>'E','Ễ'=>'E','Ệ'=>'E','Ì'=>'I','Í'=>'I','Ỉ'=>'I','Ĩ'=>'I','Ị'=>'I',
            'Ò'=>'O','Ó'=>'O','Ỏ'=>'O','Õ'=>'O','Ọ'=>'O','Ô'=>'O','Ồ'=>'O','Ố'=>'O','Ổ'=>'O','Ỗ'=>'O','Ộ'=>'O','Ơ'=>'O','Ờ'=>'O','Ớ'=>'O','Ở'=>'O','Ỡ'=>'O','Ợ'=>'O',
            'Ù'=>'U','Ú'=>'U','Ủ'=>'U','Ũ'=>'U','Ụ'=>'U','Ư'=>'U','Ừ'=>'U','Ứ'=>'U','Ử'=>'U','Ữ'=>'U','Ự'=>'U','Ỳ'=>'Y','Ý'=>'Y','Ỷ'=>'Y','Ỹ'=>'Y','Ỵ'=>'Y','Đ'=>'D'];
        return strtr((string)$s,$map);
    }
    private function parse_synonyms_map($text){
        $map = []; $lines = array_filter(array_map('trim', preg_split('/\r\n|\n|\r/', (string)$text)));
        foreach($lines as $ln){
            $g = array_values(array_unique(array_filter(array_map(function($t){
                $t = mb_strtolower(trim($t));
                return preg_replace('/[+\-\@\>\<\(\)~\*\":]/u','',$t);
            }, explode(',', $ln)))));
            if (count($g) < 2) continue;
            foreach($g as $w){ $map[$w] = $g; }
        }
        return $map;
    }
    private function boolean_query($q, $syn_map){
        $q = wp_strip_all_tags($q);
        $tokens = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($q), -1, PREG_SPLIT_NO_EMPTY);
        $tokens = array_slice($tokens, 0, 6);
        if (!$tokens) return ['',[]];

        $expanded = [];
        foreach($tokens as $t){
            $t2 = preg_replace('/[+\-\@\>\<\(\)~\*\":]/u','',$t);
            if ($t2 === '') continue;

            $expanded[] = $t2;

            if (isset($syn_map[$t2])) {
                foreach(array_slice($syn_map[$t2],0,2) as $alt){
                    $alt2 = mb_strtolower(trim($alt));
                    if ($alt2 !== '' && $alt2 !== $t2) $expanded[] = $alt2;
                }
            }
        }

        $expanded = array_values(array_unique($expanded));
        if (!$expanded) return ['',[]];

        $parts = [];
        foreach($expanded as $t){ $parts[] = '+'.$t.'*'; }
        return [implode(' ', $parts), $expanded];
    }

    private function col_exists($col){
        global $wpdb; $t = $this->table_name();
        $sql = $wpdb->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                               $t, $col);
        return ((int)$wpdb->get_var($sql)) > 0;
    }
    private function ft_indexes(){
        global $wpdb; $t = $this->table_name();
        $sql = $wpdb->prepare("SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) cols
                               FROM INFORMATION_SCHEMA.STATISTICS
                               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND INDEX_TYPE='FULLTEXT'
                               GROUP BY INDEX_NAME", $t);
        $rows = $wpdb->get_results($sql, ARRAY_A) ?: [];
        $out = [];
        foreach($rows as $r){ $out[$r['INDEX_NAME']] = $r['cols']; }
        return $out;
    }
    private function diag_info(){
        global $wpdb; $t = $this->table_name();
        $exists = (bool)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s", $t));
        $rows = $exists ? (int)$wpdb->get_var("SELECT COUNT(*) FROM `{$t}`") : 0;
        $types = $exists ? $wpdb->get_col("SELECT DISTINCT post_type FROM `{$t}` LIMIT 20") : [];
        $ft    = $exists ? $this->ft_indexes() : [];
        $hasPlain = $exists ? $this->col_exists('plain') : false;
        return compact('exists','rows','types','ft','hasPlain','t');
    }

    private function ensure_table(){
        global $wpdb;
        $t = $this->table_name();
        $charset = $wpdb->get_charset_collate();
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $sql = "
        CREATE TABLE IF NOT EXISTS {$t} (
            post_id        BIGINT(20) UNSIGNED NOT NULL,
            post_type      VARCHAR(32)  NOT NULL,
            post_status    VARCHAR(20)  NOT NULL,
            post_date      DATETIME     NOT NULL,
            post_modified  DATETIME     NOT NULL,
            slug           VARCHAR(200) NOT NULL,
            title          TEXT         NOT NULL,
            content        LONGTEXT     NOT NULL,
            keywords       TEXT         NULL,
            plain          LONGTEXT     NULL,
            PRIMARY KEY (post_id),
            KEY idx_type_status (post_type, post_status),
            KEY idx_date (post_date),
            FULLTEXT KEY ft_all (title, content, slug, keywords, plain)
        ) ENGINE=InnoDB {$charset};
        ";
        dbDelta($sql);

        $exists = (bool)$wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s", $t
        ));
        return $exists;
    }

    public function admin_fix_fulltext(){
        if (!current_user_can('manage_options') || !check_admin_referer('wpx_ft_fix_fulltext')) wp_die('Nope.');
        $ok = $this->fix_fulltext_schema();
        $qs = $ok ? 'fixed=1' : 'fixed=0';
        wp_redirect(admin_url('options-general.php?page=wpx-ft-local&'.$qs)); exit;
    }
    private function fix_fulltext_schema(){
        global $wpdb;
        $t  = $this->table_name();

        $diag = $this->diag_info();
        if (!$diag['exists']) {
            if (!$this->ensure_table()) return false;
        }
        if (!$this->col_exists('plain')) {
            $res = $wpdb->query("ALTER TABLE `{$t}` ADD COLUMN `plain` LONGTEXT NULL AFTER `keywords`");
            if ($res === false) return false;
        }
        $ft = $this->ft_indexes();
        $cols = isset($ft['ft_all']) ? $ft['ft_all'] : '';
        if ($cols !== 'title,content,slug,keywords,plain') {
            if (isset($ft['ft_all'])) {
                $drop = $wpdb->query("ALTER TABLE `{$t}` DROP INDEX `ft_all`");
                if ($drop === false) return false;
            }
            $add = $wpdb->query("ALTER TABLE `{$t}` ADD FULLTEXT KEY `ft_all` (`title`,`content`,`slug`,`keywords`,`plain`)");
            if ($add === false) return false;
        }
        return true;
    }

    /* ================= Lập chỉ mục (Indexing) ================= */
    public function allowed_type($type){ return in_array($type, $this->post_types(), true); }

    public function build_index_row($post){
        $o = $this->opts();
        $title   = $this->decode_text(get_the_title($post));
        $slug    = $post->post_name;
        $content = $post->post_excerpt ? $post->post_excerpt : $post->post_content;
        $content = wp_strip_all_tags($this->decode_text($content));
        $content = wp_trim_words($content, (int)$o['content_words'], '');

        $keywords= '';
        $tx = get_object_taxonomies($post->post_type, 'objects');
        if ($tx) {
            $names = array_keys($tx);
            $terms = wp_get_object_terms($post->ID, $names, ['fields'=>'names']);
            if (!is_wp_error($terms) && $terms){
                $keywords = implode(' ', array_map('sanitize_text_field', $terms));
            }
        }

        $plain = $this->unaccent_vi($title.' '.$slug.' '.$keywords.' '.$content);

        return [
            'post_id'       => (int)$post->ID,
            'post_type'     => $post->post_type,
            'post_status'   => $post->post_status,
            'post_date'     => $post->post_date,
            'post_modified' => $post->post_modified,
            'slug'          => $slug,
            'title'         => $title,
            'content'       => $content,
            'keywords'      => $keywords,
            'plain'         => $plain,
        ];
    }

    public function upsert_row($row){
        global $wpdb;
        $table = $this->table_name();
        $wpdb->replace($table, $row, ['%d','%s','%s','%s','%s','%s','%s','%s','%s','%s']);
    }
    public function delete_row($post_id){
        global $wpdb; $table = $this->table_name();
        $wpdb->delete($table, ['post_id'=>$post_id], ['%d']);
    }

    /* ================= Hook tự đồng bộ ================= */
    public function on_save_post($post_id, $post, $update){
        if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) return;
        if (!$this->allowed_type($post->post_type)) return;

        if ($post->post_status !== 'publish'){
            $this->delete_row($post_id); return;
        }
        $row = $this->build_index_row($post);
        $this->upsert_row($row);
    }
    public function on_deleted_post($post_id){ $this->delete_row($post_id); }
    public function on_transition($new, $old, $post){
        if (!$this->allowed_type($post->post_type)) return;
        if ($new === 'publish'){
            $row = $this->build_index_row($post);
            $this->upsert_row($row);
        } else {
            $this->delete_row($post->ID);
        }
    }

    /* ================= Hậu trường: Reindex nền ================= */
    public function admin_start_reindex(){
        if (!current_user_can('manage_options') || !check_admin_referer('wpx_ft_bg_reindex')) wp_die('Nope.');
        $fresh = !empty($_POST['fresh']) ? 1 : 0;
        $this->schedule_cron_reindex($fresh);
        wp_redirect(admin_url('options-general.php?page=wpx-ft-local&bg=started'.($fresh?'&fresh=1':''))); exit;
    }
    public function admin_stop_reindex(){
        if (!current_user_can('manage_options') || !check_admin_referer('wpx_ft_bg_reindex')) wp_die('Nope.');
        $ts = wp_next_scheduled(self::CRON_HOOK);
        if ($ts) wp_unschedule_event($ts, self::CRON_HOOK);
        delete_option(self::OPT_QUEUE);
        $st = get_option(self::OPT_STAT, []);
        $st['running']  = false;
        $st['finished'] = true;
        update_option(self::OPT_STAT, $st, false);
        wp_redirect(admin_url('options-general.php?page=wpx-ft-local&bg=stopped')); exit;
    }
    public function admin_run_batch_now(){
        if (!current_user_can('manage_options') || !check_admin_referer('wpx_ft_bg_reindex')) wp_die('Nope.');
        $this->cron_reindex_worker();
        wp_redirect(admin_url('options-general.php?page=wpx-ft-local&bg=batch-done')); exit;
    }
    public function admin_prune(){
        if (!current_user_can('manage_options') || !check_admin_referer('wpx_ft_prune')) wp_die('Nope.');
        $this->prune_stale_rows();
        wp_redirect(admin_url('options-general.php?page=wpx-ft-local&bg=pruned')); exit;
    }

    private function prune_stale_rows(){
        global $wpdb;
        $table = $this->table_name();
        $types = $this->post_types();
        $in    = implode("','", array_map('esc_sql',$types));
        $sql = "
          DELETE t FROM {$table} t
          LEFT JOIN {$wpdb->posts} p ON p.ID = t.post_id
          WHERE p.ID IS NULL
             OR p.post_status <> 'publish'
             OR t.post_type NOT IN ('{$in}')
        ";
        $wpdb->query($sql);
    }

    private function schedule_cron_reindex($fresh = 0){
        $types = $this->post_types();
        $q = new WP_Query([
            'post_type'      => $types,
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'fields'         => 'ids',
            'orderby'        => 'ID',
            'order'          => 'ASC',
            'no_found_rows'  => true,
        ]);
        $ids = array_map('intval', $q->posts);
        update_option(self::OPT_QUEUE, $ids, false);
        update_option(self::OPT_STAT, [
            'total'      => count($ids),
            'done'       => 0,
            'started_at' => current_time('mysql'),
            'finished'   => false,
            'running'    => true,
            'mode'       => 'cron',
            'fresh'      => $fresh ? 1 : 0,
            'truncated'  => 0,
        ], false);

        if (!wp_next_scheduled(self::CRON_HOOK)) {
            wp_schedule_single_event(time()+2, self::CRON_HOOK);
        }
    }

    public function cron_reindex_worker(){
        global $wpdb;
        $queue = get_option(self::OPT_QUEUE, []);
        $stat  = get_option(self::OPT_STAT, []);
        $table = $this->table_name();

        if (!empty($stat['fresh']) && empty($stat['truncated'])) {
            $ok = $wpdb->query("TRUNCATE TABLE {$table}");
            if ($ok === false) { $wpdb->query("DELETE FROM {$table}"); }
            $stat['truncated'] = 1;
            update_option(self::OPT_STAT, $stat, false);
        }

        if (empty($queue) || empty($stat['running'])) {
            $stat['finished']=true; $stat['running']=false;
            update_option(self::OPT_STAT, $stat, false);
            return;
        }

        $batch = 300;
        $chunk = array_splice($queue, 0, $batch);

        foreach ($chunk as $pid){
            $post = get_post($pid);
            if ($post && $post->post_status === 'publish' && $this->allowed_type($post->post_type)) {
                $row = $this->build_index_row($post);
                $this->upsert_row($row);
            } else {
                $this->delete_row($pid);
            }
        }

        update_option(self::OPT_QUEUE, $queue, false);
        $done = (int)($stat['done'] ?? 0) + count($chunk);
        $stat['done'] = $done;
        if (empty($queue)) { $stat['finished']=true; $stat['running']=false; }
        update_option(self::OPT_STAT, $stat, false);

        if (!empty($queue)) {
            wp_schedule_single_event(time()+5, self::CRON_HOOK);
        }
    }

    /* ================= WP-CLI spawn (không dùng shell_exec) ================= */
    public function admin_spawn_cli(){
        if (!current_user_can('manage_options') || !check_admin_referer('wpx_ft_spawn_cli')) wp_die('Nope.');

        if (!function_exists('proc_open')) {
            $this->schedule_cron_reindex(0);
            wp_redirect(admin_url('options-general.php?page=wpx-ft-local&bg=fallback-cron')); exit;
        }

        $wp_bin = $this->locate_wpcli();
        if (!$wp_bin) {
            $this->schedule_cron_reindex(0);
            wp_redirect(admin_url('options-general.php?page=wpx-ft-local&bg=fallback-cron')); exit;
        }

        $types  = implode(',', $this->post_types());
        $batch  = 800;
        $wpPath = ABSPATH;

        $cmd = $wp_bin
             . ' wpx-ft reindex'
             . ' --types=' . escapeshellarg($types)
             . ' --batch=' . escapeshellarg($batch)
             . ' --path='  . escapeshellarg($wpPath)
             . ' --quiet';

        $isWin = stripos(PHP_OS_FAMILY,'Windows')===0;
        $background = $isWin ? 'start /B ' . $cmd : 'nohup ' . $cmd . ' >/dev/null 2>&1 &';

        $descriptorspec = [
            0 => ['file', $isWin ? 'NUL' : '/dev/null', 'r'],
            1 => ['file', $isWin ? 'NUL' : '/dev/null', 'w'],
            2 => ['file', $isWin ? 'NUL' : '/dev/null', 'w'],
        ];

        $proc = @proc_open($isWin ? ['cmd.exe','/C',$background] : ['/bin/sh','-c',$background], $descriptorspec, $pipes);
        if (is_resource($proc)) {
            @proc_close($proc);
            update_option(self::OPT_STAT, [
                'total'      => 0,
                'done'       => 0,
                'started_at' => current_time('mysql'),
                'finished'   => false,
                'running'    => true,
                'mode'       => 'wp-cli',
            ], false);
            wp_redirect(admin_url('options-general.php?page=wpx-ft-local&bg=cli-started')); exit;
        }

        $this->schedule_cron_reindex(0);
        wp_redirect(admin_url('options-general.php?page=wpx-ft-local&bg=fallback-cron')); exit;
    }

    private function locate_wpcli(){
        $env = getenv('WP_CLI_BIN');
        if ($env && is_string($env)) {
            if (substr($env, -10) === 'wp-cli.phar' && is_file($env)) return 'php ' . $env;
            if (is_executable($env)) return $env;
        }
        $cands = ['/usr/local/bin/wp','/usr/bin/wp','/bin/wp'];
        foreach ($cands as $c) {
            if (is_executable($c)) return $c;
            if (substr($c, -10) === 'wp-cli.phar' && is_file($c) && is_readable($c)) return 'php ' . $c;
        }
        return null;
    }

    /* ================= Search (boost không phân biệt hoa/thường) ================= */
    public function rest_search(WP_REST_Request $r){
        global $wpdb;
        $o    = $this->opts();
        $qraw = (string)$r->get_param('q');
        $q    = trim($qraw);
        $page = max(1, (int)$r->get_param('page'));
        $per  = min(50, max(1, (int)($r->get_param('per') ?: $o['limit'])));
        $offset = ($page-1)*$per;

        if ($q === '') return ['items'=>[], 'page'=>$page, 'per'=>$per];

        $synmap = $this->parse_synonyms_map($o['synonyms']);
        list($bq,) = $this->boolean_query($q, $synmap);
        if ($bq === '') return ['items'=>[], 'page'=>$page, 'per'=>$per];

        $phrase        = preg_replace('/\s+/u', ' ', $q);
        $phrase_plain  = mb_strtolower($this->unaccent_vi($phrase));
        $phrase_q      = '"' . $phrase . '"';
        $phrase_plain_q= '"' . $phrase_plain . '"';

        $table = $this->table_name();
        $types = $this->post_types();
        $in    = implode("','", array_map('esc_sql',$types));

        $recency_days = max(1, (int)$o['recency_days']); // tránh chia 0

        // Dùng LOWER(...) để boost không phân biệt hoa/thường (tránh phụ thuộc COLLATE máy chủ)
        $sql = "
        SELECT 
            idx.post_id, 
            idx.post_type, 
            idx.post_date, 
            idx.title, 
            idx.content,

            /* Điểm FT tổng quát */
            MATCH(idx.title,idx.content,idx.slug,idx.keywords,idx.plain) AGAINST (%s IN BOOLEAN MODE) AS ft_score,

            /* Phrase boost có dấu & không dấu */
            MATCH(idx.title,idx.content,idx.slug,idx.keywords,idx.plain) AGAINST (%s IN BOOLEAN MODE) AS phr_score,
            MATCH(idx.title,idx.content,idx.slug,idx.keywords,idx.plain) AGAINST (%s IN BOOLEAN MODE) AS phr_plain_score,

            /* Ưu tiên tiêu đề: exact & prefix (case-insensitive) */
            (CASE WHEN LOCATE(LOWER(%s), LOWER(idx.title))   > 0 THEN 1 ELSE 0 END) AS exact_title_hit,
            (CASE WHEN LOCATE(LOWER(%s), LOWER(idx.title))   = 1 THEN 1 ELSE 0 END) AS title_prefix,

            /* Nếu cụm xuất hiện trong content (ít quan trọng) */
            (CASE WHEN LOCATE(LOWER(%s), LOWER(idx.content)) > 0 THEN 1 ELSE 0 END) AS exact_content_hit,

            /* Recency: time-decay 0..1 (mới=1, cũ→0) */
            GREATEST(0, 1 - (TIMESTAMPDIFF(DAY, idx.post_date, NOW()) / (%d + 0.0))) AS rec_linear,

            /* Popularity (số bình luận) */
            LOG(1 + p.comment_count) AS popularity_score

        FROM {$table} AS idx
        LEFT JOIN {$wpdb->posts} p ON p.ID = idx.post_id

        WHERE idx.post_status='publish'
          AND idx.post_type IN ('{$in}')
          AND MATCH(idx.title,idx.content,idx.slug,idx.keywords,idx.plain) AGAINST (%s IN BOOLEAN MODE)

        ORDER BY
            /* Tầng 1: cụm xuất hiện trong tiêu đề, rồi prefix */
            exact_title_hit DESC,
            title_prefix    DESC,

            /* Tầng 2: điểm tổng hợp (recency mạnh) */
            ( rec_linear*80
            + LEAST(phr_score, 1e6)*10
            + LEAST(phr_plain_score, 1e6)*6
            + exact_content_hit*2
            + popularity_score*1
            + LEAST(ft_score, 1e6)
            ) DESC,

            /* Cuối cùng: bài mới hơn đứng trước */
            idx.post_date DESC

        LIMIT %d OFFSET %d
        ";

        $rows = $wpdb->get_results($wpdb->prepare(
            $sql,
            $bq,               // ft_score
            $phrase_q,         // phr_score
            $phrase_plain_q,   // phr_plain_score
            $phrase,           // exact_title_hit
            $phrase,           // title_prefix
            $phrase,           // exact_content_hit
            $recency_days,     // recency divisor
            $bq,               // WHERE MATCH(...)
            $per,
            $offset
        ));

        $items = [];
        foreach($rows as $row){
            $excerpt_raw = wp_trim_words($row->content, (int)$o['excerpt_words'], '…');
            $items[] = [
                'id'      => (int)$row->post_id,
                'title'   => $this->decode_text($row->title),
                'url'     => get_permalink($row->post_id),
                'date'    => get_post_time('c', true, $row->post_id),
                'type'    => $row->post_type,
                'excerpt' => $this->decode_text($excerpt_raw),
                'thumb'   => !empty($o['show_thumb']) ? (get_the_post_thumbnail_url($row->post_id, $o['thumb_size']) ?: null) : null,
            ];
        }
        return ['items'=>$items, 'page'=>$page, 'per'=>$per];
    }

    public function rest_suggest(WP_REST_Request $r){
        global $wpdb;
        $term = trim((string)$r->get_param('q'));
        if ($term === '') return ['items'=>[]];

        $synmap = $this->parse_synonyms_map($this->opts()['synonyms']);
        list($bq,) = $this->boolean_query($term, $synmap);
        if ($bq === '') return ['items'=>[]];

        $table = $this->table_name();
        $types = $this->post_types();
        $in    = implode("','", array_map('esc_sql',$types));

        $sql = "
            SELECT post_id, title
            FROM {$table}
            WHERE post_status='publish'
              AND post_type IN ('{$in}')
              AND MATCH(title, content, slug, keywords, plain) AGAINST (%s IN BOOLEAN MODE)
            ORDER BY post_date DESC
            LIMIT %d
        ";
        $rows = $wpdb->get_results($wpdb->prepare($sql, $bq, 6));

        $out = [];
        foreach($rows as $r2){
            $out[] = [
                'title' => $this->decode_text($r2->title),
                'url'   => get_permalink($r2->post_id),
            ];
        }
        return ['items'=>$out];
    }

    /* ================= FE dropdown ================= */
    public function enqueue(){
        wp_register_style('wpx-ft-style', false);
        wp_add_inline_style('wpx-ft-style', '
            .wpx-ft-dd{position:fixed;z-index:99999;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,.08);overflow:hidden;max-width:680px}
            .wpx-ft-item{padding:10px 12px;border-top:1px solid #f2f2f2}
            .wpx-ft-item:first-child{border-top:0}
            .wpx-ft-item.is-active{background:#f6f7f8}
            .wpx-ft-item a{display:flex;gap:10px;text-decoration:none;align-items:flex-start}
            .wpx-ft-thumb{width:56px;height:56px;flex:0 0 56px;object-fit:cover;border-radius:6px;background:#f3f4f6}
            .wpx-ft-title{font-weight:600;line-height:1.3}
            .wpx-ft-exc{color:#666;font-size:13px;margin-top:2px;line-height:1.35}
            .wpx-ft-more{padding:10px 12px;text-align:center;background:#fafafa;border-top:1px solid #f0f0f0}
            .wpx-ft-more a{text-decoration:none;font-weight:600}
            .wpx-ft-hl{background:linear-gradient(transparent 60%, #fff3a3 60%);}
        ');
        wp_enqueue_style('wpx-ft-style');
    }
    public function inject_js(){
        $o = $this->opts();
        if (empty($o['hijack_flatsome'])) return;

        $conf = [
            'min'           => (int)$o['min_chars'],
            'per'           => (int)$o['limit'],
            'showThumb'     => !empty($o['show_thumb']),
            'showExcerpt'   => !empty($o['show_excerpt']),
            'showViewAll'   => !empty($o['show_view_all']),
            'viewAllText'   => (string)$o['view_all_text'],
            'searchURLBase'=> home_url('/?s='),
            'endpoint'      => rest_url('wpx-ft/v1/search'),
            'suggest'       => rest_url('wpx-ft/v1/suggest'),
        ];
        ?>
        <script>
        (function(CONF){
          const ddMap = new WeakMap();
          function debounce(fn,ms){let t;return function(){clearTimeout(t);const a=arguments; t=setTimeout(()=>fn.apply(this,a),ms)}}
          function esc(s){return (s||'').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
          function getDD(input){let dd=ddMap.get(input); if(!dd){ dd=document.createElement('div'); dd.className='wpx-ft-dd'; dd.style.display='none'; document.body.appendChild(dd); ddMap.set(input,dd);} return dd;}
          function positionDD(input, dd){const r=input.getBoundingClientRect(); dd.style.left=Math.round(r.left+window.scrollX)+'px'; dd.style.top=Math.round(r.bottom+window.scrollY)+'px'; dd.style.width=Math.round(r.width)+'px'; dd.style.display='block';}
          function hideDD(input){const dd=ddMap.get(input); if(dd){ dd.style.display='none'; dd.innerHTML=''; dd.removeAttribute('data-active'); }}

          function highlight(text,q){
            const escTxt = esc(text);
            if(!q) return escTxt;
            const phrase = q.trim().replace(/\s+/g,' ');
            const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            try{
              const rePhrase = new RegExp("(" + reEsc(phrase) + ")", "ig");
              let h = escTxt.replace(rePhrase,'<span class="wpx-ft-hl">$1</span>');
              if(h !== escTxt) return h;
            }catch(e){}
            try{
              const ws = phrase.split(/\s+/).filter(Boolean).map(reEsc);
              if(!ws.length) return escTxt;
              const re = new RegExp("(" + ws.join("|") + ")", "ig");
              return escTxt.replace(re,'<span class="wpx-ft-hl">$1</span>');
            }catch(e){ return escTxt; }
          }

          function render(items, dd, q){
            if(!items||!items.length){ dd.style.display='none'; dd.innerHTML=''; return; }
            dd.innerHTML = items.map((it,i)=>{
              const thumb = (CONF.showThumb && it.thumb) ? `<img class="wpx-ft-thumb" src="${esc(it.thumb)}" alt="">` : '';
              const exc   = (CONF.showExcerpt && it.excerpt) ? `<div class="wpx-ft-exc">${highlight(it.excerpt, q)}</div>` : '';
              return `<div class="wpx-ft-item${i===0?' is-active':''}" data-idx="${i}">
                        <a href="${it.url}">
                          ${thumb}
                          <div class="wpx-ft-body">
                            <div class="wpx-ft-title">${highlight(it.title, q)}</div>
                            ${exc}
                          </div>
                        </a>
                      </div>`;
            }).join('');
            if (CONF.showViewAll){ const viewURL = CONF.searchURLBase + encodeURIComponent(q); dd.innerHTML += `<div class="wpx-ft-more"><a href="${viewURL}">${esc(CONF.viewAllText)}</a></div>`; }
            dd.style.display='block';
          }

          async function fetchJSON(url){ const r = await fetch(url, {credentials:'same-origin'}); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
          function matchesSearch(el){
            if(!(el instanceof HTMLInputElement)) return false;
            if(el.type==='search') return true;
            if((el.name||'').toLowerCase()==='s') return true;
            if(el.classList.contains('search-field')) return true;
            return false;
          }

          const onType = debounce(async function(e){
            const input=e.target; if(!matchesSearch(input)) return;
            const q=input.value.trim(); const dd=getDD(input);
            if(q.length < CONF.min){ hideDD(input); return; }
            positionDD(input, dd); dd.innerHTML='<div class="wpx-ft-item">Đang tìm...</div>';
            try{ const data=await fetchJSON(CONF.endpoint+'?q='+encodeURIComponent(q)+'&per='+CONF.per); render((data.items||[]), dd, q); positionDD(input, dd); }
            catch(err){ dd.innerHTML='<div class="wpx-ft-item">Lỗi tìm kiếm</div>'; }
          }, 180);

          const onFocus = async function(e){
            const el=e.target; if(!matchesSearch(el)) return;
            const q=(el.value||'').trim();
            if(q.length>0 && q.length<CONF.min){
              const dd=getDD(el);
              try{
                const data=await fetchJSON(CONF.suggest+'?q='+encodeURIComponent(q));
                if((data.items||[]).length){
                  dd.innerHTML = data.items.map((it,i)=>`
                    <div class="wpx-ft-item${i===0?' is-active':''}" data-idx="${i}">
                      <a href="${it.url}">
                        <div class="wpx-ft-body"><div class="wpx-ft-title">${highlight(it.title,q)}</div></div>
                      </a>
                    </div>`).join('');
                  positionDD(el, dd);
                }
              }catch(_){}
            }
          };

          // Điều hướng bằng bàn phím
          document.addEventListener('keydown', function(e){
            const el=e.target; if(!matchesSearch(el)) return;
            const dd=ddMap.get(el); if(!dd||dd.style.display==='none') return;
            const items=Array.from(dd.querySelectorAll('.wpx-ft-item')); if(!items.length) return;
            let idx=items.findIndex(n=>n.classList.contains('is-active'));
            if(e.key==='ArrowDown'){ e.preventDefault(); idx=(idx+1)%items.length; items.forEach(n=>n.classList.remove('is-active')); items[idx].classList.add('is-active'); }
            else if(e.key==='ArrowUp'){ e.preventDefault(); idx=(idx<=0?items.length:idx)-1; items.forEach(n=>n.classList.remove('is-active')); items[idx].classList.add('is-active'); }
            else if(e.key==='Enter'){ const a=(idx>=0 && items[idx])? items[idx].querySelector('a'):null; if(a){ window.location.href=a.href; } }
            else if(e.key==='Escape'){ hideDD(el); }
          }, true);

          document.addEventListener('input', onType, true);
          document.addEventListener('focusin', onFocus, true);

          function repositionAll(){ ddMap.forEach((dd, input)=>{ if(dd.style.display!=='none'){ positionDD(input, dd);} }); }
          window.addEventListener('scroll', repositionAll, {passive:true});
          window.addEventListener('resize', repositionAll);
          document.addEventListener('focusout', function(e){ const el=e.target; if(matchesSearch(el)){ setTimeout(()=>hideDD(el), 160);} }, true);
          document.addEventListener('focusin', function(e){ const el=e.target; if(matchesSearch(el) && el.value.trim().length>=CONF.min){ positionDD(el, getDD(el)); }}, true);
        })(<?php echo wp_json_encode($conf); ?>);
        </script>
        <?php
    }
}

/* ============ Bootstrap ============ */
WPX_FT_LocalIndex::instance();

/* ============ WP-CLI Command ============ */
if (defined('WP_CLI') && WP_CLI) {
    class WPX_FT_CLI_Command extends WP_CLI_Command {
        /**
         * Reindex toàn bộ bài viết vào bảng wpx_ft_index.
         *
         * ## Tuỳ chọn
         * [--types=<csv>]  CSV post types (vd: post,page). Mặc định theo plugin.
         * [--batch=<n>]    Số bài mỗi lượt (mặc định 500).
         * [--fresh]        Nếu có, TRUNCATE bảng trước khi index (làm mới hoàn toàn).
         */
        public function reindex($args, $assoc_args) {
            $plugin = \WPX_FT_LocalIndex::instance();
            $types  = isset($assoc_args['types']) ? array_map('sanitize_key', explode(',', $assoc_args['types'])) : $plugin->post_types();
            $batch  = max(50, (int)($assoc_args['batch'] ?? 500));
            $fresh  = isset($assoc_args['fresh']);

            update_option(\WPX_FT_LocalIndex::OPT_STAT, [
                'total'      => 0,
                'done'       => 0,
                'started_at' => current_time('mysql'),
                'finished'   => false,
                'running'    => true,
                'mode'       => 'wp-cli',
                'fresh'      => $fresh ? 1 : 0,
                'truncated'  => 0,
            ], false);

            global $wpdb;
            $table = $wpdb->prefix . \WPX_FT_LocalIndex::TABLE;
            if ($fresh) {
                $ok = $wpdb->query("TRUNCATE TABLE {$table}");
                if ($ok === false) { $wpdb->query("DELETE FROM {$table}"); }
                $st = get_option(\WPX_FT_LocalIndex::OPT_STAT, []);
                $st['truncated'] = 1;
                update_option(\WPX_FT_LocalIndex::OPT_STAT, $st, false);
            }

            $q = new WP_Query([
                'post_type'      => $types,
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'fields'         => 'ids',
                'orderby'        => 'ID',
                'order'          => 'ASC',
                'no_found_rows'  => true,
            ]);
            $ids = $q->posts;
            $total = count($ids);

            $st = get_option(\WPX_FT_LocalIndex::OPT_STAT, []);
            $st['total'] = $total;
            $st['done']  = 0;
            update_option(\WPX_FT_LocalIndex::OPT_STAT, $st, false);

            if (!$total) {
                $st['finished']=true; $st['running']=false;
                update_option(\WPX_FT_LocalIndex::OPT_STAT, $st, false);
                WP_CLI::success('Không có bài để lập chỉ mục.');
                return;
            }

            $bar = \WP_CLI\Utils\make_progress_bar('Đang lập chỉ mục', $total);
            $i = 0;

            foreach (array_chunk($ids, $batch) as $chunk) {
                foreach ($chunk as $pid) {
                    $post = get_post($pid);
                    if ($post && $post->post_status === 'publish' && $plugin->allowed_type($post->post_type)) {
                        $row = $plugin->build_index_row($post);
                        $plugin->upsert_row($row);
                    } else {
                        $plugin->delete_row($pid);
                    }
                    $i++; $bar->tick();
                }
                $st = get_option(\WPX_FT_LocalIndex::OPT_STAT, []);
                $st['done'] = $i;
                update_option(\WPX_FT_LocalIndex::OPT_STAT, $st, false);
            }
            $bar->finish();

            $st = get_option(\WPX_FT_LocalIndex::OPT_STAT, []);
            $st['done']     = $i;
            $st['finished'] = true;
            $st['running']  = false;
            update_option(\WPX_FT_LocalIndex::OPT_STAT, $st, false);

            WP_CLI::success("Đã lập chỉ mục {$i}/{$total} bài.");
        }
    }
    WP_CLI::add_command('wpx-ft', 'WPX_FT_CLI_Command');
}
