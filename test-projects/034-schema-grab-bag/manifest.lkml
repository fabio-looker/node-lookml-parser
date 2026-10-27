project_name: "lookml_sandbox"

constant: default_region {
  value: "US"
  export: override_optional
}

localization_settings: {
  default_locale: en
  localization_level: permissive
}

local_dependency: {
  project: "sample_thelook_ecommerce"
  # PARSER override_constant: imported_region {
  #   value: "EU"
  # }
}

# PARSER remote_dependency: external_blocks {
#   url: "https://github.com/example/lookml-blocks.git"
#   ref: "main"
#   override_constant: block_region {
#     value: "APAC"
#   }
# }

application: order_manager {
  label: "Order Manager"
  url: "https://example.com/bundle.js"
  mount_points: {
    dashboard_vis: yes
    dashboard_tile: yes
    standalone: yes
  }
  entitlements: {
    local_storage: yes
    navigation: yes
    new_window: yes
    use_form_submit: yes
    use_embeds: yes
    use_downloads: yes
    use_iframes: yes
    use_clipboard: yes
    core_api_methods: ["me"]
    external_api_urls: ["https://api.example.com"]
    oauth2_urls: ["https://auth.example.com/oauth"]
    global_user_attributes: ["id"]
    scoped_user_attributes: ["name"]
    new_window_external_urls: ["https://docs.example.com"]
  }
}

application: local_app {
  label: "Local App"
  file: "bundle.js"
}
