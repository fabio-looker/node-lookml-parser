project_name: "hub_project"

constant: hub_schema {
  value: "hub_db"
}

constant: chained_label {
  value: "@{hub_schema} Users"
}

local_dependency: {
  project: "spoke_project"
  override_constant: spoke_schema {
    value: "@{hub_schema}_overridden_spoke"
  }
}
