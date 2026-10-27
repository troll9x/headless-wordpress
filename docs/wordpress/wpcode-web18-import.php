<?php
/**
 * Temporary WPCode PHP snippet for the public web18 document migration.
 * Admin only, resumable, one document per AJAX request. Remove after audit.
 * WPCode strips this opening PHP tag when pasted into a PHP snippet.
 */

if (!defined('ABSPATH')) {
    exit;
}

const TLU_WEB18_TOTAL = 438;
const TLU_WEB18_SIZE = 1629185639;
const TLU_WEB18_CURSOR = 'tlu_web18_import_cursor_20261021';
const TLU_WEB18_PAGE_SIZE = 50;

add_filter('acf/load_field/name=hieu_luc', function ($field) {
    $field['choices']['chuacohieuluc'] = 'Chưa có hiệu lực';
    return $field;
});

function tlu_web18_source_page($page) {
    $url = add_query_arg(array(
        'PortalId' => 0, 'TypeId' => 0, 'SectorId' => 0,
        'IssueId' => 0, 'ImplementId' => 0, 'PriorityId' => 0,
        'DocNumber' => '', 'Status' => 4, 'Keyword' => '',
        'pageindex' => $page, 'pagesize' => TLU_WEB18_PAGE_SIZE,
    ), 'https://web18.tlu.edu.vn/DesktopModules/cmsview/api/Document/list');
    $response = wp_remote_get($url, array('timeout' => 25, 'redirection' => 2));
    if (is_wp_error($response)) {
        return $response;
    }
    if (200 !== wp_remote_retrieve_response_code($response)) {
        return new WP_Error('web18_source_http', 'Source API HTTP ' . wp_remote_retrieve_response_code($response));
    }
    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (!is_array($data) || !isset($data['ListData']) || !is_array($data['ListData']) ||
        (int) ($data['TotalCount'] ?? -1) !== TLU_WEB18_TOTAL) {
        return new WP_Error('web18_source_changed', 'The source inventory changed; stop and rebuild the manifest.');
    }
    return $data['ListData'];
}

function tlu_web18_source_document($offset) {
    $page = intdiv($offset, TLU_WEB18_PAGE_SIZE) + 1;
    $rows = tlu_web18_source_page($page);
    if (is_wp_error($rows)) {
        return $rows;
    }
    $document = $rows[$offset % TLU_WEB18_PAGE_SIZE] ?? null;
    if (!is_array($document) || empty($document['Id']) || empty($document['Subject'])) {
        return new WP_Error('web18_source_row', 'Source document missing at offset ' . $offset);
    }
    return $document;
}

function tlu_web18_post_for_id($source_id) {
    $posts = get_posts(array(
        'post_type' => 'tai-lieu', 'post_status' => 'any',
        'posts_per_page' => 1, 'fields' => 'ids',
        'meta_key' => '_web18_document_id', 'meta_value' => (string) $source_id,
    ));
    return $posts ? (int) $posts[0] : 0;
}

function tlu_web18_attachment_for_id($source_id) {
    $posts = get_posts(array(
        'post_type' => 'attachment', 'post_status' => 'inherit',
        'posts_per_page' => 1, 'fields' => 'ids',
        'meta_key' => '_web18_attachment_id', 'meta_value' => (string) $source_id,
    ));
    return $posts ? (int) $posts[0] : 0;
}

function tlu_web18_term_id($document) {
    $type = (string) ($document['docType']['DocumentTypeName'] ?? '');
    if (false !== strpos($type, 'Đảng')) return 106;
    if ('Văn bản trường' === $type) return 108;
    if ('Biểu mẫu' === $type) return 109;
    return 107;
}

function tlu_web18_effect($source_value) {
    if (1 === (int) $source_value) return 'conhieuluc';
    if (2 === (int) $source_value) return 'hethieuluc';
    if (3 === (int) $source_value) return 'chuacohieuluc';
    return '';
}

function tlu_web18_date($date) {
    if (!is_string($date) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $date, $parts)) return '';
    return $parts[1] . $parts[2] . $parts[3];
}

function tlu_web18_file_url($relative) {
    if (!is_string($relative) || 0 !== strpos($relative, '/Portals/0/DocumentFiles/') ||
        false !== strpos($relative, '..')) {
        return new WP_Error('web18_file_path', 'Unexpected source file path.');
    }
    $parts = array_map('rawurlencode', explode('/', ltrim($relative, '/')));
    return 'https://web18.tlu.edu.vn/' . implode('/', $parts);
}

function tlu_web18_import_file($source, $post_id) {
    $source_id = (int) ($source['Id'] ?? 0);
    if ($source_id <= 0) return new WP_Error('web18_file_id', 'Missing source attachment ID.');
    $existing = tlu_web18_attachment_for_id($source_id);
    if ($existing && get_attached_file($existing) && file_exists(get_attached_file($existing))) {
        return $existing;
    }

    $url = tlu_web18_file_url($source['FileUrl'] ?? '');
    if (is_wp_error($url)) return $url;
    require_once ABSPATH . 'wp-admin/includes/file.php';
    $temp = wp_tempnam('web18-' . $source_id);
    if (!$temp) return new WP_Error('web18_temp', 'Cannot create a temporary file.');
    $response = wp_remote_get($url, array(
        'timeout' => 180, 'redirection' => 2,
        'stream' => true, 'filename' => $temp,
    ));
    if (is_wp_error($response)) {
        wp_delete_file($temp);
        return $response;
    }
    $status = wp_remote_retrieve_response_code($response);
    if (404 === $status) {
        wp_delete_file($temp);
        return new WP_Error('web18_file_missing', 'Source attachment HTTP 404.');
    }
    if (200 !== $status || !filesize($temp)) {
        wp_delete_file($temp);
        return new WP_Error('web18_file_http', 'Source attachment HTTP ' . $status);
    }
    $declared = (int) ($source['FileSize'] ?? 0);
    if ($declared > 0 && filesize($temp) !== $declared) {
        wp_delete_file($temp);
        return new WP_Error('web18_file_size', 'Source attachment size mismatch.');
    }
    $digest = hash_file('sha256', $temp);
    $name = sanitize_file_name(basename((string) ($source['FileName'] ?? '')));
    if (!$name || !preg_match('/\.(pdf|docx?)$/i', $name)) {
        wp_delete_file($temp);
        return new WP_Error('web18_file_type', 'Unexpected attachment extension.');
    }
    $upload = wp_handle_sideload(array(
        'name' => $source_id . '-' . $name,
        'type' => (string) ($source['ContentType'] ?? ''),
        'tmp_name' => $temp,
        'error' => 0,
        'size' => filesize($temp),
    ), array('test_form' => false));
    if (isset($upload['error'])) {
        wp_delete_file($temp);
        return new WP_Error('web18_upload', (string) $upload['error']);
    }
    $attachment_id = wp_insert_attachment(array(
        'post_mime_type' => $upload['type'],
        'post_title' => pathinfo($name, PATHINFO_FILENAME),
        'post_status' => 'inherit',
    ), $upload['file'], $post_id, true);
    if (is_wp_error($attachment_id)) return $attachment_id;
    update_post_meta($attachment_id, '_web18_attachment_id', $source_id);
    update_post_meta($attachment_id, '_web18_document_id', (int) $source['DocumentId']);
    update_post_meta($attachment_id, '_web18_original_url', $url);
    update_post_meta($attachment_id, '_web18_sha256', $digest);
    update_post_meta($attachment_id, '_web18_bytes', (int) filesize($upload['file']));
    return (int) $attachment_id;
}

function tlu_web18_import_document($document) {
    $source_id = (int) $document['Id'];
    $post_id = tlu_web18_post_for_id($source_id);
    if (!$post_id) {
        $date = (string) ($document['SignDate'] ?? '');
        $post_id = wp_insert_post(array(
            'post_type' => 'tai-lieu',
            'post_status' => 'draft',
            'post_title' => sanitize_text_field((string) $document['Subject']),
            'post_date' => preg_match('/^\d{4}-\d{2}-\d{2}/', $date) ? str_replace('T', ' ', substr($date, 0, 19)) : current_time('mysql'),
        ), true);
        if (is_wp_error($post_id)) return $post_id;
        update_post_meta($post_id, '_web18_document_id', $source_id);
    }
    if ('1' === get_post_meta($post_id, '_web18_import_complete', true)) {
        return array('post_id' => $post_id, 'reused' => true, 'missing' => array());
    }

    $rows = array();
    $missing = array();
    foreach ((array) ($document['docAttachments'] ?? array()) as $source) {
        if (!is_array($source) || !empty($source['IsDeleted']) || false === ($source['Status'] ?? true)) continue;
        $attachment = tlu_web18_import_file($source, $post_id);
        if (is_wp_error($attachment)) {
            if ('web18_file_missing' === $attachment->get_error_code()) {
                $missing[] = (int) $source['Id'];
                continue;
            }
            return $attachment;
        }
        $rows[] = array('field_68673983b1cd6' => $attachment);
    }

    if (!function_exists('update_field')) return new WP_Error('web18_acf', 'ACF is unavailable.');
    update_field('field_6867394ab1cd5', $rows, $post_id);
    update_field('field_687faec02c501', sanitize_text_field((string) ($document['DocNumber'] ?? '')), $post_id);
    $date = tlu_web18_date($document['SignDate'] ?? null);
    if ($date) update_field('field_687faf032c502', $date, $post_id);
    $effect = tlu_web18_effect($document['IsInEffect'] ?? null);
    if ($effect) update_field('field_6ad81c9cdea39', $effect, $post_id);
    update_post_meta($post_id, '_web18_source_type', sanitize_text_field((string) ($document['docType']['DocumentTypeName'] ?? '')));
    update_post_meta($post_id, '_web18_source_sector', sanitize_text_field((string) ($document['docSector']['DocumentFieldName'] ?? '')));
    update_post_meta($post_id, '_web18_effect_date', sanitize_text_field((string) ($document['EffectDate'] ?? '')));
    update_post_meta($post_id, '_web18_missing_attachments', $missing);
    wp_set_object_terms($post_id, tlu_web18_term_id($document), 'loai-tai-lieu', false);
    if (function_exists('pll_set_post_language')) pll_set_post_language($post_id, 'vi');

    $published = wp_update_post(array('ID' => $post_id, 'post_status' => 'publish'), true);
    if (is_wp_error($published)) return $published;
    update_post_meta($post_id, '_web18_import_complete', '1');
    return array('post_id' => $post_id, 'reused' => false, 'files' => count($rows), 'missing' => $missing);
}

function tlu_web18_free_bytes() {
    $uploads = wp_get_upload_dir();
    $path = is_dir($uploads['basedir'] ?? '') ? $uploads['basedir'] : WP_CONTENT_DIR;
    return disk_free_space($path);
}

function tlu_web18_ajax_guard() {
    if (!current_user_can('manage_options')) wp_send_json_error('Forbidden.', 403);
    check_ajax_referer('tlu_web18_import_20261021', 'nonce');
}

add_action('wp_ajax_tlu_web18_preflight', function () {
    tlu_web18_ajax_guard();
    $free = tlu_web18_free_bytes();
    $first = tlu_web18_source_page(1);
    wp_send_json_success(array(
        'cursor' => (int) get_option(TLU_WEB18_CURSOR, 0),
        'total' => TLU_WEB18_TOTAL,
        'free_bytes' => $free,
        'required_bytes' => TLU_WEB18_SIZE + 536870912,
        'source_ok' => !is_wp_error($first),
        'source_error' => is_wp_error($first) ? $first->get_error_message() : '',
        'acf_ok' => function_exists('update_field'),
    ));
});

add_action('wp_ajax_tlu_web18_step', function () {
    tlu_web18_ajax_guard();
    $cursor = (int) get_option(TLU_WEB18_CURSOR, 0);
    if ($cursor >= TLU_WEB18_TOTAL) wp_send_json_success(array('cursor' => $cursor, 'done' => true));
    $free = tlu_web18_free_bytes();
    if (false === $free || $free < 536870912) wp_send_json_error('Less than 512 MB free in uploads volume.', 507);
    $document = tlu_web18_source_document($cursor);
    if (is_wp_error($document)) wp_send_json_error($document->get_error_message(), 502);
    $result = tlu_web18_import_document($document);
    if (is_wp_error($result)) wp_send_json_error('Document ' . (int) $document['Id'] . ': ' . $result->get_error_message(), 500);
    update_option(TLU_WEB18_CURSOR, $cursor + 1, false);
    wp_send_json_success(array(
        'cursor' => $cursor + 1, 'total' => TLU_WEB18_TOTAL,
        'source_id' => (int) $document['Id'], 'result' => $result,
        'free_bytes' => tlu_web18_free_bytes(),
        'done' => $cursor + 1 >= TLU_WEB18_TOTAL,
    ));
});

add_action('admin_menu', function () {
    add_management_page('Web18 document migration', 'Web18 migration', 'manage_options', 'tlu-web18-import', function () {
        if (!current_user_can('manage_options')) return;
        $nonce = wp_create_nonce('tlu_web18_import_20261021');
        echo '<div class="wrap"><h1>Web18 document migration</h1>';
        echo '<p>438 public documents, 502 declared attachments (about 1.63 GB). Existing CMS documents are preserved. The importer resumes by source ID.</p>';
        echo '<p><button class="button" id="web18-preflight">Check source and disk</button> ';
        echo '<button class="button" id="web18-one" disabled>Import one</button> ';
        echo '<button class="button button-primary" id="web18-start" disabled>Start / Resume</button> ';
        echo '<button class="button" id="web18-pause" disabled>Pause</button></p>';
        echo '<pre id="web18-status" style="white-space:pre-wrap;max-width:900px"></pre></div>';
        $js = <<<'JS'
        (() => {
          const status = document.getElementById('web18-status');
          const start = document.getElementById('web18-start');
          const one = document.getElementById('web18-one');
          const pause = document.getElementById('web18-pause');
          let running = false;
          const nonce = __NONCE__;
          async function call(action) {
            const body = new URLSearchParams({action, nonce});
            const response = await fetch(ajaxurl, {method:'POST', credentials:'same-origin', body});
            const value = await response.json();
            if (!response.ok || !value.success) throw new Error(typeof value.data === 'string' ? value.data : 'Request failed');
            return value.data;
          }
          function show(data) { status.textContent = JSON.stringify(data, null, 2); }
          document.getElementById('web18-preflight').onclick = async () => {
            try {
              const data = await call('tlu_web18_preflight'); show(data);
              start.disabled = !data.source_ok || !data.acf_ok || data.free_bytes < data.required_bytes;
              one.disabled = start.disabled;
            } catch (error) { status.textContent = error.message; }
          };
          one.onclick = async () => {
            one.disabled = true;
            try { show(await call('tlu_web18_step')); }
            catch (error) { status.textContent = error.message; }
            one.disabled = false;
          };
          start.onclick = async () => {
            running = true; start.disabled = true; pause.disabled = false;
            while (running) {
              try {
                const data = await call('tlu_web18_step'); show(data);
                if (data.done) running = false;
              } catch (error) { status.textContent = error.message; running = false; }
            }
            start.disabled = false; pause.disabled = true;
          };
          pause.onclick = () => { running = false; };
        })();
JS;
        wp_print_inline_script_tag(str_replace('__NONCE__', wp_json_encode($nonce), $js));
    });
});
