from os import path

_icon_path_for_customer = {
	"android": "development/android/res/",
	"safari": "development/forge.safariextension/",
	"firefox": "development/firefox/",
	"ios": "development/ios/*.app/",
	"wp": "development/wp/dist/"
}

def create_all_js(build):
	return [
		{'do': {'add_to_all_js': 'common-v2/modules/launchimage/default.js'}},
		{'when': {'config_property_false_or_missing': 'modules.launchimage.hide-manually'},
			'do': {'add_to_all_js': 'common-v2/modules/launchimage/auto_hide.js'}},
	]

def customer_phase(build):
	icon_path = _icon_path_for_customer
	def icon(platform, sub_path):
		return path.join(icon_path[platform], sub_path)

	return [
		{'when': {'platform_is': 'ios', 'have_ios_launch': ()}, 'do': {'copy_files': {
			'from': '${modules["launchimage"]["iphone"]}',
			'to': icon("ios", "Default~iphone.png")
		}}},
		{'when': {'platform_is': 'ios', 'have_ios_launch': ()}, 'do': {'copy_files': {
			'from': '${modules["launchimage"]["iphone-retina"]}',
			'to': icon("ios", "Default@2x~iphone.png")
		}}},
		{'when': {'platform_is': 'ios', 'have_ios_launch': ()}, 'do': {'copy_files': {
			'from': '${modules["launchimage"]["iphone-retina4"]}',
			'to': icon("ios", "Default-568h@2x~iphone.png")
		}}},
		{'when': {'platform_is': 'ios', 'have_ios_launch': ()}, 'do': {'copy_files': {
			'from': '${modules["launchimage"]["ipad"]}',
			'to': icon("ios", "Default-Portrait~ipad.png")
		}}},
		{'when': {'platform_is': 'ios', 'have_ios_launch': ()}, 'do': {'copy_files': {
			'from': '${modules["launchimage"]["ipad-landscape"]}',
			'to': icon("ios", "Default-Landscape~ipad.png")
		}}},
		{'when': {'platform_is': 'ios', 'have_ios_launch': ()}, 'do': {'copy_files': {
			'from': '${modules["launchimage"]["ipad-retina"]}',
			'to': icon("ios", "Default-Portrait@2x~ipad.png")
		}}},
		{'when': {'platform_is': 'ios', 'have_ios_launch': ()}, 'do': {'copy_files': {
			'from': '${modules["launchimage"]["ipad-landscape-retina"]}',
			'to': icon("ios", "Default-Landscape@2x~ipad.png")
		}}},
	]
		
def platform_specific_templating(build):
	return [
		{'when': {'platform_is': 'android', 'have_android_launch': ()}, 'do': {'set_in_json': {
			"filename": "android/ForgeTemplate/assets/app_config.json",
			"key": "splashimage",
			"value": "${modules.launchimage.android}"
		}}},
		{'when': {'platform_is': 'android', 'have_android_launch': ()}, 'do': {'set_in_json': {
			"filename": "android/ForgeTemplate/assets/app_config.json",
			"key": "splashimage_landscape",
			"value": "${modules.launchimage['android-landscape']}"
		}}},
		{'when': {'platform_is': 'android',
			'config_property_exists': 'modules.launchimage.background-color'},
			'do': {'set_element_value_xml': {
				"file": 'android/ForgeTemplate/res/values/styles.xml',
				"value": "${modules.launchimage['background-color']}",
				"element": "color[@name='custom_launchimage_background']",
			}
		}},
		{'when': {'platform_is': 'android',
			'config_property_exists': 'modules.launchimage.background-color'},
			'do': {'set_element_value_xml': {
				"file": 'android/ForgeTemplate/res/values-v11/styles.xml',
				"value": "${modules.launchimage['background-color']}",
				"element": "color[@name='custom_launchimage_background']",
			},
		}},
	]
