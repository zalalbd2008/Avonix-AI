<?php
/**
 * Standalone chat document for iframe embeds (?avonix_chat_embed=1).
 *
 * Avoids wp_head()/wp_footer() so theme chrome (cart buttons, cookie bars)
 * does not render inside the frame.
 *
 * @var string $avonix_chat_embed_html
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!isset($avonix_chat_embed_html)) {
    $avonix_chat_embed_html = '';
}

do_action('wp_enqueue_scripts');
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo('charset'); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="robots" content="noindex, nofollow" />
	<?php
	wp_print_styles();
	wp_print_head_scripts();
	?>
</head>
<body class="avonix-chat-embed-doc">
	<?php
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- markup built in Avonix_Chat.
	echo $avonix_chat_embed_html;
	wp_print_footer_scripts();
	?>
</body>
</html>
