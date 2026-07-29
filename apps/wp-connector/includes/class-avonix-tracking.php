<?php
/**
 * Class-based activity tracking (spec §8.3).
 *
 * The agency adds a class to an element on the client's site — `avx-track-book`,
 * `avx-consult-call`, `avx-form-contact` — and every click on it is reported.
 * Nothing else is watched: no scroll depth, no mouse movement, no fingerprint.
 * The site owner decides what is measured by choosing what to mark.
 *
 * Events post through admin-ajax rather than straight to the platform, for the
 * same reason form submissions do: the connector key stays on the server and
 * never reaches a browser where anyone could read it out of the page source.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('Avonix_Tracking')) {
    return;
}

class Avonix_Tracking
{
    /** Prefix => event type. Longest prefix wins, so order matters. */
    const CLASS_MAP = [
        'avx-consult-' => 'consultation',
        'avx-form-'    => 'form',
        'avx-track-'   => 'button',
    ];

    public function __construct()
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue']);
        add_action('wp_ajax_avonix_events', [$this, 'ingest']);
        add_action('wp_ajax_nopriv_avonix_events', [$this, 'ingest']);
        add_action('wp_ajax_avonix_form_analytics', [$this, 'ingest_form_analytics']);
        add_action('wp_ajax_nopriv_avonix_form_analytics', [$this, 'ingest_form_analytics']);
        add_action('wp_ajax_avonix_ultimate_submit', [$this, 'ultimate_submit']);
        add_action('wp_ajax_nopriv_avonix_ultimate_submit', [$this, 'ultimate_submit']);
        add_action('wp_ajax_avonix_form_ai', [$this, 'form_ai']);
        add_action('wp_ajax_nopriv_avonix_form_ai', [$this, 'form_ai']);
    }

    public function enqueue()
    {
        $client = new Avonix_Client();
        if (!$client->is_configured()) {
            return;
        }

        // No file to ship: the script is short, and inlining it means one fewer
        // request on the client's page.
        wp_register_script('avonix-tracking', false, [], AVONIX_VERSION, true);
        wp_enqueue_script('avonix-tracking');
        wp_add_inline_script('avonix-tracking', $this->script());
    }

    private function script()
    {
        $config = wp_json_encode([
            'ajax'    => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('avonix_events'),
            'formNonce' => wp_create_nonce('avonix_form_analytics'),
            'submitNonce' => wp_create_nonce('avonix_ultimate_submit'),
            'aiNonce' => wp_create_nonce('avonix_form_ai'),
            'prefixes' => array_keys(self::CLASS_MAP),
            'page'    => $this->current_path(),
        ]);

        return <<<JS
(function () {
  var cfg = {$config};
  var queue = [];
  var timer = null;
  var formQueue = [];
  var formTimer = null;

  function flush() {
    if (!queue.length) return;
    var batch = queue.splice(0, 50);
    var body = new FormData();
    body.append('action', 'avonix_events');
    body.append('nonce', cfg.nonce);
    body.append('events', JSON.stringify(batch));
    // keepalive so a click that navigates away still reports.
    fetch(cfg.ajax, { method: 'POST', body: body, credentials: 'same-origin', keepalive: true })
      .catch(function () {});
  }

  function push(event) {
    queue.push(event);
    clearTimeout(timer);
    // Batched: a page with several tracked buttons should not open a
    // connection per click.
    timer = setTimeout(flush, 800);
  }

  function flushForm() {
    if (!formQueue.length) return;
    var batch = formQueue.splice(0, 40);
    var body = new FormData();
    body.append('action', 'avonix_form_analytics');
    body.append('nonce', cfg.formNonce);
    body.append('events', JSON.stringify(batch));
    fetch(cfg.ajax, { method: 'POST', body: body, credentials: 'same-origin', keepalive: true })
      .catch(function () {});
  }

  function pushForm(event) {
    formQueue.push(event);
    clearTimeout(formTimer);
    formTimer = setTimeout(flushForm, 600);
  }

  window.AvonixFormTrack = function (event) {
    if (!event || !event.type || !event.form_id) return;
    pushForm(event);
  };

  window.AvonixUltimateSubmit = function (payload, done) {
    var body = new FormData();
    body.append('action', 'avonix_ultimate_submit');
    body.append('nonce', cfg.submitNonce);
    body.append('payload', JSON.stringify(payload || {}));
    fetch(cfg.ajax, { method: 'POST', body: body, credentials: 'same-origin', keepalive: true })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (data) {
        var extra = (data && data.success && data.data) ? data.data : {};
        if (typeof done === 'function') done(!!(data && data.success), extra);
      })
      .catch(function () {
        if (typeof done === 'function') done(false, {});
      });
  };

  window.AvonixFormAi = function (payload, done) {
    var body = new FormData();
    body.append('action', 'avonix_form_ai');
    body.append('nonce', cfg.aiNonce);
    body.append('payload', JSON.stringify(payload || {}));
    fetch(cfg.ajax, { method: 'POST', body: body, credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (data) {
        var text = data && data.success && data.data && data.data.text ? data.data.text : '';
        if (typeof done === 'function') done(!!text, text || (data && data.data && data.data.message) || '');
      })
      .catch(function () {
        if (typeof done === 'function') done(false, '');
      });
  };

  push({ type: 'pageview', page_path: cfg.page });

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[class]') : null;
    while (el) {
      var classes = (el.className && el.className.baseVal !== undefined)
        ? el.className.baseVal.split(/\\s+/)
        : String(el.className || '').split(/\\s+/);

      for (var i = 0; i < classes.length; i++) {
        for (var p = 0; p < cfg.prefixes.length; p++) {
          if (classes[i].indexOf(cfg.prefixes[p]) === 0) {
            push({
              type: 'class:' + classes[i],
              css_class: classes[i],
              label: (el.innerText || el.textContent || '').trim().slice(0, 200),
              purpose: el.getAttribute('data-avx-purpose') || '',
              page_path: cfg.page
            });
            return;
          }
        }
      }
      el = el.parentElement;
    }
  }, true);

  window.addEventListener('pagehide', function () {
    flush();
    flushForm();
  });
})();
JS;
    }

    /**
     * Receive a batch from the browser and forward it with the key attached.
     *
     * The nonce stops another origin posting here on a visitor's behalf. It does
     * not authenticate the visitor — there is nobody to authenticate — and the
     * platform re-checks the connector key regardless.
     */
    public function ingest()
    {
        if (!check_ajax_referer('avonix_events', 'nonce', false)) {
            wp_send_json_error(['message' => 'Bad nonce'], 403);
        }

        $raw = isset($_POST['events']) ? wp_unslash($_POST['events']) : '';
        $events = json_decode((string) $raw, true);
        if (!is_array($events)) {
            wp_send_json_error(['message' => 'Bad payload'], 400);
        }

        $clean = [];
        foreach (array_slice($events, 0, 50) as $event) {
            if (!is_array($event)) {
                continue;
            }

            $type = $this->resolve_type($event);
            if ($type === null) {
                continue;
            }

            $clean[] = [
                'type'      => $type,
                'css_class' => $this->text($event, 'css_class', 120),
                'label'     => $this->text($event, 'label', 200),
                'purpose'   => $this->text($event, 'purpose', 200),
                'page_path' => $this->text($event, 'page_path', 2000) ?: '/',
            ];
        }

        if (!$clean) {
            wp_send_json_success(['accepted' => 0]);
        }

        $client = new Avonix_Client();
        $client->forward('/api/v1/connector/events', ['events' => $clean]);

        // Always 200 to the browser. A tracking failure must never surface as an
        // error on the client's own website.
        wp_send_json_success(['accepted' => count($clean)]);
    }

    /** Batched form funnel events (view / start / field / complete / …). */
    public function ingest_form_analytics()
    {
        if (!check_ajax_referer('avonix_form_analytics', 'nonce', false)) {
            wp_send_json_error(['message' => 'Bad nonce'], 403);
        }

        $raw = isset($_POST['events']) ? wp_unslash($_POST['events']) : '';
        $events = json_decode((string) $raw, true);
        if (!is_array($events)) {
            wp_send_json_error(['message' => 'Bad payload'], 400);
        }

        $allowed = ['view', 'start', 'field', 'step', 'complete', 'abandon'];
        $clean = [];
        foreach (array_slice($events, 0, 40) as $event) {
            if (!is_array($event)) {
                continue;
            }
            $type = sanitize_key((string) ($event['type'] ?? ''));
            if (!in_array($type, $allowed, true)) {
                continue;
            }
            $form_id = $this->text($event, 'form_id', 80);
            if ($form_id === '') {
                continue;
            }
            $row = [
                'type'       => $type,
                'form_id'    => $form_id,
                'session_id' => $this->text($event, 'session_id', 80),
                'field_key'  => $this->text($event, 'field_key', 80),
                'step_id'    => $this->text($event, 'step_id', 80),
                'page_url'   => $this->text($event, 'page_url', 2000),
            ];
            if (isset($event['duration_ms']) && is_numeric($event['duration_ms'])) {
                $row['duration_ms'] = max(0, min(86400000, (int) $event['duration_ms']));
            }
            if (isset($event['utm']) && is_array($event['utm'])) {
                $utm = [];
                foreach (['source', 'medium', 'campaign', 'term', 'content'] as $k) {
                    if (!empty($event['utm'][$k])) {
                        $utm[$k] = substr(sanitize_text_field((string) $event['utm'][$k]), 0, 200);
                    }
                }
                if ($utm) {
                    $row['utm'] = $utm;
                }
            }
            $clean[] = $row;
        }

        if (!$clean) {
            wp_send_json_success(['accepted' => 0]);
        }

        $client = new Avonix_Client();
        $client->forward('/api/v1/connector/form-analytics', ['events' => $clean]);
        wp_send_json_success(['accepted' => count($clean)]);
    }

    /** Embed “Improve message” → cloud form-ai rewrite. */
    public function form_ai()
    {
        if (!check_ajax_referer('avonix_form_ai', 'nonce', false)) {
            wp_send_json_error(['message' => 'Bad nonce'], 403);
        }

        $raw = isset($_POST['payload']) ? wp_unslash($_POST['payload']) : '';
        $payload = json_decode((string) $raw, true);
        if (!is_array($payload)) {
            wp_send_json_error(['message' => 'Bad payload'], 400);
        }

        $message = isset($payload['message'])
            ? sanitize_textarea_field((string) $payload['message'])
            : '';
        $form_id = sanitize_text_field((string) ($payload['form_id'] ?? ''));
        if ($message === '' || $form_id === '') {
            wp_send_json_error(['message' => 'form_id and message required'], 400);
        }

        $body = [
            'form_id' => $form_id,
            'message' => substr($message, 0, 5000),
        ];
        if (!empty($payload['intent'])) {
            $body['intent'] = substr(sanitize_text_field((string) $payload['intent']), 0, 120);
        }

        $client = new Avonix_Client();
        list($ok, $data) = $client->forward('/api/v1/connector/form-ai', $body);
        if ($ok && !empty($data['text'])) {
            wp_send_json_success(['text' => (string) $data['text']]);
        }
        $msg = is_array($data) && !empty($data['message'])
            ? (string) $data['message']
            : 'Rewrite unavailable';
        wp_send_json_error(['message' => $msg], 502);
    }

    /** Ultimate builder embed → cloud submit (includes UTM / timing meta). */
    public function ultimate_submit()
    {
        if (!check_ajax_referer('avonix_ultimate_submit', 'nonce', false)) {
            wp_send_json_error(['message' => 'Bad nonce'], 403);
        }

        $raw = isset($_POST['payload']) ? wp_unslash($_POST['payload']) : '';
        $payload = json_decode((string) $raw, true);
        if (!is_array($payload)) {
            wp_send_json_error(['message' => 'Bad payload'], 400);
        }

        $fields = isset($payload['fields']) && is_array($payload['fields'])
            ? $payload['fields']
            : [];
        $clean_fields = [];
        foreach ($fields as $k => $v) {
            $key = sanitize_key((string) $k);
            if ($key === '') {
                continue;
            }
            if (is_scalar($v)) {
                $clean_fields[$key] = substr(sanitize_text_field((string) $v), 0, 5000);
            }
        }

        $body = [
            'form_id'  => sanitize_text_field((string) ($payload['form_id'] ?? '')),
            'name'     => sanitize_text_field((string) ($payload['name'] ?? ($clean_fields['name'] ?? ''))),
            'email'    => sanitize_email((string) ($payload['email'] ?? ($clean_fields['email'] ?? ''))),
            'phone'    => sanitize_text_field((string) ($payload['phone'] ?? ($clean_fields['phone'] ?? ''))),
            'message'  => sanitize_textarea_field((string) ($payload['message'] ?? ($clean_fields['message'] ?? ''))),
            'page_url' => esc_url_raw((string) ($payload['page_url'] ?? '')),
            'hp'       => sanitize_text_field((string) ($payload['hp'] ?? '')),
            'fields'   => $clean_fields,
        ];

        if (!empty($payload['captcha_token'])) {
            $body['captcha_token'] = substr(sanitize_text_field((string) $payload['captcha_token']), 0, 4000);
        }
        if (!empty($payload['otp'])) {
            $body['otp'] = substr(sanitize_text_field((string) $payload['otp']), 0, 12);
        }
        if (!empty($payload['otp_request'])) {
            $body['otp_request'] = true;
        }

        if (isset($payload['meta']) && is_array($payload['meta'])) {
            $meta = [];
            if (isset($payload['meta']['utm']) && is_array($payload['meta']['utm'])) {
                $utm = [];
                foreach (['source', 'medium', 'campaign', 'term', 'content'] as $k) {
                    if (!empty($payload['meta']['utm'][$k])) {
                        $utm[$k] = substr(sanitize_text_field((string) $payload['meta']['utm'][$k]), 0, 200);
                    }
                }
                if ($utm) {
                    $meta['utm'] = $utm;
                }
            }
            foreach (['referrer', 'pageUrl', 'startedAt', 'completedAt', 'sessionId'] as $k) {
                if (!empty($payload['meta'][$k])) {
                    $meta[$k] = substr(sanitize_text_field((string) $payload['meta'][$k]), 0, 2000);
                }
            }
            if (isset($payload['meta']['durationMs']) && is_numeric($payload['meta']['durationMs'])) {
                $meta['durationMs'] = max(0, min(86400000, (int) $payload['meta']['durationMs']));
            }
            if ($meta) {
                $body['meta'] = $meta;
            }
        }

        list($ok, $message, $data) = (new Avonix_Client())->submit($body);
        if ($ok) {
            $out = ['status' => 'ok'];
            if (is_array($data) && !empty($data['portal_url'])) {
                $out['portal_url'] = (string) $data['portal_url'];
            }
            wp_send_json_success($out);
        }
        wp_send_json_error(['message' => is_string($message) ? $message : 'Submit failed'], 502);
    }

    /**
     * Map the reported class back to an event type here, on the server.
     *
     * The browser sends the class it matched; it does not get to name the type.
     * Otherwise anyone could post `{"type":"form"}` and inflate a client's
     * conversion figures from the console.
     */
    private function resolve_type(array $event)
    {
        if (($event['type'] ?? '') === 'pageview') {
            return 'pageview';
        }

        $class = (string) ($event['css_class'] ?? '');
        foreach (self::CLASS_MAP as $prefix => $type) {
            if (strpos($class, $prefix) === 0) {
                return $type;
            }
        }

        return null;
    }

    private function text(array $event, $key, $max)
    {
        $value = isset($event[$key]) ? sanitize_text_field((string) $event[$key]) : '';
        return substr($value, 0, $max);
    }

    private function current_path()
    {
        $uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '/';
        $path = parse_url($uri, PHP_URL_PATH);
        return $path ? substr($path, 0, 2000) : '/';
    }
}
