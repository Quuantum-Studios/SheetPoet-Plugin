=== SheetPoet – Spreadsheet Connector ===
Contributors: quuantum
Tags: google sheets, functions, data processing, automation
Requires at least: 5.9
Tested up to: 6.8
Stable tag: 1.0.2
Requires PHP: 7.3
Donate link: https://www.quuantum.com
License: GPL-2.0+
License URI: http://www.gnu.org/licenses/gpl-2.0.txt

A powerful plugin that connects your WordPress site to a companion Google Sheets Add-on for seamless data processing, automation, and synchronization.

== Description ==

**SheetPoet** is a powerful WordPress plugin that works hand-in-hand with its companion Google Sheets Add-on. It enables you to create and manage secure PHP functions via the WordPress admin and trigger them directly from your spreadsheet. You can import data from WordPress into Sheets, send spreadsheet data to your site, or run one-time custom logic.

### Features

* Works with the official **SheetPoet** extension for Google Sheets
* Create and manage custom PHP functions via admin UI
* 3 function types:
  - **Import to Sheet**: Fetch data from WordPress and populate your spreadsheet
  - **Upload to Website**: Send spreadsheet rows to WordPress for processing
  - **One-time Trigger**: Perform logic like syncing or cleanup
* API key authentication for secure access
* React-based interface for a smooth UX
* Function execution logs and error tracking

### How It Works

1. **Install and Activate the Plugin:** Install **SheetPoet** on your WordPress site.
2. **Configure API:** Generate your secure API key under 'SheetPoet > Settings'.
3. **Install the Sheets Add-on:** Install the SheetPoet Add-on in your Google Sheet.
4. **Create Functions:** Use the admin interface to define your processing logic in PHP.
5. **Trigger from Sheets:** Use the Add-on interface to trigger your custom functions and exchange data with WordPress.

#### Contribute

* Active development of this plugin is handled [on GitHub](https://github.com/Quuantum-Studios/SheetPoet-Plugin/).
* Contributions are welcome via pull requests.

== Use Cases ==

* Import custom post data into Google Sheets
* Upload leads or form entries from Sheets to WordPress
* Automate recurring tasks or one-time actions like data cleanup
* Sync product, order, user data, or any other data between Sheets and WordPress
* Use Google Sheets as a control panel for your site

== Rate & Support Us ==

If you find SheetPoet helpful, please [leave a 5-star review](https://wordpress.org/support/plugin/sheetpoet/reviews/?rate=5#new-post). Your support helps us improve!

== Compatibility ==

* Compatible with WordPress 6.0+
* Tested with PHP 7.4+
* Works with all major themes and plugins

== Support ==

For questions or issues, visit the [support forums](https://wordpress.org/support/plugin/sheetpoet).

== Installation ==

1. Upload the `sheetpoet` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin from your WordPress dashboard.
3. Visit ‘SheetPoet > Settings’ to configure your API key.
4. Visit ‘SheetPoet > Functions’ to add custom functions.
5. Install the **SheetPoet** Add-on in your Google Sheet.
6. Start syncing data between Sheets and WordPress!

== Frequently Asked Questions ==

= How do I authenticate requests? =
Every request from the Sheets Add-on must include a valid API key, generated in the plugin settings.

= What types of functions can I create? =
You can create three types:
- Import to Sheet
- Upload to Website
- One-time Triggers

= Can I return custom results from my functions? =
Yes, your PHP functions can return data back to Sheets as arrays or string, which is handled by the Add-on.

= Is it safe to run PHP from Sheets? =
Yes. Each function is validated and sanitized, and only accessible via authenticated API calls.

== Screenshots ==

1. Settings page with API configuration
2. Function management interface
3. Function editor with validation and syntax highlighting
4. Execution logs and debug panel
5. Log details view

== Changelog ==

= 1.0.0 =
Release Date: May 10, 2025

* Initial release.

== Upgrade Notice ==

No upgrade steps needed for this version.
