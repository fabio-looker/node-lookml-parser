include: "orders.view.lkml"

explore: orders {
  always_filter: {
    filters: [status: "Complete"]
  }
}
