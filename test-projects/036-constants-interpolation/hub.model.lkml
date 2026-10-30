connection: "@{hub_schema}_conn"
include: "//spoke_project/views/spoke_users.view.lkml"

explore: spoke_users {
  label: "@{chained_label}"
}
