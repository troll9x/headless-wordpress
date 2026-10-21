// WPCode PHP snippet. Paste without an opening PHP tag.
// Adds an editable document-sector taxonomy, a read-only library API and an
// idempotent admin migration of Web18 source-sector metadata.

add_action('init', function () {
    register_taxonomy('linh-vuc-tai-lieu', ['tai-lieu'], [
        'labels' => [
            'name' => 'Lĩnh vực tài liệu',
            'singular_name' => 'Lĩnh vực',
            'search_items' => 'Tìm lĩnh vực',
            'all_items' => 'Tất cả lĩnh vực',
            'edit_item' => 'Sửa lĩnh vực',
            'add_new_item' => 'Thêm lĩnh vực',
        ],
        'public' => true,
        'show_ui' => true,
        'show_in_rest' => true,
        'show_admin_column' => true,
        'hierarchical' => true,
        'rewrite' => false,
    ]);
}, 20);

add_filter('acf/load_field/name=hieu_luc', function ($field) {
    $field['choices']['chuacohieuluc'] = 'Chưa có hiệu lực';
    return $field;
});

function tlu_document_library_file_url($value) {
    if (is_numeric($value)) return wp_get_attachment_url((int) $value) ?: '';
    if (is_array($value)) {
        if (!empty($value['url'])) return esc_url_raw($value['url']);
        if (!empty($value['ID'])) return wp_get_attachment_url((int) $value['ID']) ?: '';
        if (!empty($value['id'])) return wp_get_attachment_url((int) $value['id']) ?: '';
    }
    return is_string($value) && preg_match('~^https?://~i', $value) ? esc_url_raw($value) : '';
}

function tlu_document_library_field($name, $post_id) {
    $value = function_exists('get_field') ? get_field($name, $post_id) : null;
    return $value !== null && $value !== false ? $value : get_post_meta($post_id, $name, true);
}

function tlu_document_library_row($post) {
    $id = $post->ID;
    $files = [];
    $repeater = tlu_document_library_field('tai_len_tai_lieu', $id);
    if (is_array($repeater)) {
        foreach ($repeater as $file_row) {
            if (!is_array($file_row)) continue;
            $url = tlu_document_library_file_url($file_row['tai_lieu'] ?? null);
            if ($url) $files[] = [
                'url' => $url,
                'title' => sanitize_text_field((string) ($file_row['ky_hieu'] ?? basename(wp_parse_url($url, PHP_URL_PATH) ?: ''))),
            ];
        }
    }
    $date = (string) tlu_document_library_field('ngay_ban_hanh', $id);
    $sectors = wp_get_post_terms($id, 'linh-vuc-tai-lieu', ['fields' => 'all']);
    return [
        'id' => $id,
        'slug' => $post->post_name,
        'title' => get_the_title($id),
        'symbol' => sanitize_text_field((string) tlu_document_library_field('ky_hieu', $id)),
        'issued_date' => $date,
        'effect_status' => sanitize_key((string) tlu_document_library_field('hieu_luc', $id)),
        'sectors' => is_wp_error($sectors) ? [] : array_map(function ($term) {
            return ['id' => $term->term_id, 'slug' => $term->slug, 'name' => html_entity_decode($term->name, ENT_QUOTES | ENT_HTML5, 'UTF-8')];
        }, $sectors),
        'files' => $files,
        'detail_url' => '/tai-lieu/' . rawurlencode($post->post_name),
    ];
}

add_action('rest_api_init', function () {
    register_rest_route('headless/v1', '/document-library/item/(?P<slug>[a-z0-9-]+)', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $request) {
            $post = get_page_by_path(sanitize_title($request['slug']), OBJECT, 'tai-lieu');
            if (!$post || $post->post_status !== 'publish') return new WP_Error('document_missing', 'Document not found.', ['status' => 404]);
            return rest_ensure_response(tlu_document_library_row($post));
        },
    ]);
    register_rest_route('headless/v1', '/document-library', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $request) {
            $category = sanitize_title((string) ($request->get_param('category') ?: 'van-ban-truong'));
            $sector = sanitize_title((string) $request->get_param('sector'));
            $query_text = sanitize_text_field((string) $request->get_param('q'));
            $query_text = mb_substr($query_text, 0, 100);
            $page = max(1, min(1000, (int) ($request->get_param('page') ?: 1)));
            $per_page = max(1, min(50, (int) ($request->get_param('per_page') ?: 20)));
            $category_term = get_term_by('slug', $category, 'loai-tai-lieu');
            if (!$category_term) return new WP_Error('document_category_missing', 'Document category not found.', ['status' => 404]);
            $tax_query = [[
                'taxonomy' => 'loai-tai-lieu', 'field' => 'term_id',
                'terms' => [(int) $category_term->term_id], 'include_children' => true,
            ]];
            if ($sector) $tax_query[] = [
                'taxonomy' => 'linh-vuc-tai-lieu', 'field' => 'slug', 'terms' => [$sector],
            ];
            $args = [
                'post_type' => 'tai-lieu', 'post_status' => 'publish',
                'posts_per_page' => $per_page, 'paged' => $page,
                'tax_query' => $tax_query,
                'orderby' => ['date' => 'DESC', 'ID' => 'DESC'],
                'suppress_filters' => false,
            ];
            // The source symbol is an ACF scalar, so include it in keyword search.
            if ($query_text !== '') {
                $search_filter = function ($search, $wp_query) use ($query_text) {
                    if (!$wp_query->get('tlu_library_search')) return $search;
                    global $wpdb;
                    $like = '%' . $wpdb->esc_like($query_text) . '%';
                    return $wpdb->prepare(
                        " AND ({$wpdb->posts}.post_title LIKE %s OR EXISTS (SELECT 1 FROM {$wpdb->postmeta} dm WHERE dm.post_id = {$wpdb->posts}.ID AND dm.meta_key = 'ky_hieu' AND dm.meta_value LIKE %s))",
                        $like, $like
                    );
                };
                add_filter('posts_search', $search_filter, 10, 2);
                $args['tlu_library_search'] = true;
            }
            $posts = new WP_Query($args);
            if (isset($search_filter)) remove_filter('posts_search', $search_filter, 10);
            $terms = get_terms(['taxonomy' => 'linh-vuc-tai-lieu', 'hide_empty' => true, 'orderby' => 'name']);
            return rest_ensure_response([
                'category' => ['id' => $category_term->term_id, 'slug' => $category_term->slug, 'name' => $category_term->name],
                'items' => array_map('tlu_document_library_row', $posts->posts),
                'total' => (int) $posts->found_posts,
                'page' => $page,
                'per_page' => $per_page,
                'pages' => (int) $posts->max_num_pages,
                'sectors' => is_wp_error($terms) ? [] : array_map(function ($term) {
                    return ['id' => $term->term_id, 'slug' => $term->slug, 'name' => html_entity_decode($term->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'), 'count' => $term->count];
                }, $terms),
            ]);
        },
    ]);
});

add_action('wp_ajax_tlu_document_sector_backfill', function () {
    if (!current_user_can('manage_options')) wp_send_json_error('Forbidden', 403);
    check_ajax_referer('tlu_document_sector_backfill');
    $after = max(0, (int) ($_POST['after'] ?? 0));
    $posts = get_posts([
        'post_type' => 'tai-lieu', 'post_status' => 'any',
        'posts_per_page' => 40, 'orderby' => 'ID', 'order' => 'ASC',
        'meta_key' => '_web18_source_sector',
        'suppress_filters' => false,
        'fields' => 'ids',
        'tlu_after_id' => $after,
    ]);
    // posts_where is scoped to this one query to avoid a large offset scan.
    $changed = 0;
    $last = $after;
    foreach ($posts as $id) {
        $id = (int) $id;
        $last = max($last, $id);
        $name = trim((string) get_post_meta($id, '_web18_source_sector', true));
        if ($name === '') continue;
        $term = term_exists($name, 'linh-vuc-tai-lieu');
        if (!$term) $term = wp_insert_term($name, 'linh-vuc-tai-lieu');
        if (is_wp_error($term)) continue;
        $term_id = (int) (is_array($term) ? $term['term_id'] : $term);
        $current = wp_get_post_terms($id, 'linh-vuc-tai-lieu', ['fields' => 'ids']);
        if (!is_wp_error($current) && !in_array($term_id, $current, true)) {
            wp_set_object_terms($id, [$term_id], 'linh-vuc-tai-lieu');
            $changed++;
        }
    }
    wp_send_json_success(['after' => $last, 'scanned' => count($posts), 'changed' => $changed, 'done' => count($posts) < 40]);
});

add_filter('posts_where', function ($where, $query) {
    if (!$query->get('tlu_after_id')) return $where;
    global $wpdb;
    return $where . $wpdb->prepare(" AND {$wpdb->posts}.ID > %d", (int) $query->get('tlu_after_id'));
}, 10, 2);

add_action('admin_menu', function () {
    add_submenu_page('edit.php?post_type=tai-lieu', 'Đồng bộ lĩnh vực Web18', 'Đồng bộ lĩnh vực', 'manage_options', 'tlu-document-sectors', function () {
        $nonce = wp_create_nonce('tlu_document_sector_backfill');
        echo '<div class="wrap"><h1>Đồng bộ lĩnh vực tài liệu Web18</h1><p>Gắn taxonomy Lĩnh vực từ metadata nguồn. Chạy lại an toàn; không xóa dữ liệu cũ.</p><button class="button button-primary" id="tlu-sector-run">Bắt đầu đồng bộ</button><p id="tlu-sector-status" role="status"></p></div>';
        echo '<script>document.getElementById("tlu-sector-run").onclick=async function(){this.disabled=true;let after=0,scanned=0,changed=0;const status=document.getElementById("tlu-sector-status");try{while(true){const body=new URLSearchParams({action:"tlu_document_sector_backfill",_ajax_nonce:' . wp_json_encode($nonce) . ',after:String(after)});const response=await fetch(ajaxurl,{method:"POST",credentials:"same-origin",body});const result=await response.json();if(!result.success)throw new Error(JSON.stringify(result.data));after=result.data.after;scanned+=result.data.scanned;changed+=result.data.changed;status.textContent=`Đã kiểm tra ${scanned} tài liệu, gắn lĩnh vực cho ${changed}.`;if(result.data.done)break;}status.textContent+= " Hoàn tất.";}catch(error){status.textContent="Lỗi: "+error.message;}finally{this.disabled=false;}};</script>';
    });
});
