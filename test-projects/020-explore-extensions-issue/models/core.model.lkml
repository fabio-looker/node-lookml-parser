include: "_base_dimension_joins.model.lkml"
include: "../views/fct_client_invoice_paid.view.lkml"

explore: fct_client_created {
  extends: [account, client]
  from: fct_client_created
}

explore: fct_client_invoice_paid {
  extends: [account, client, user]
  from: fct_client_invoice_paid
}

explore: fct_user_signed_in {
  extends: [account, client]
  from: fct_user_signed_in
}