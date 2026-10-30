project_name: "hub_project"

constant: hub_schema {
  value: "hub_db"
}

local_dependency: {
  project: "spoke_project"
  override_constant: spoke_schema {
    value: "overridden_spoke_db"
  }
}
