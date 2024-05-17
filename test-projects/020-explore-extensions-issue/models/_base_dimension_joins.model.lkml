connection: "< some database >"

include: "../views/dim_account.view.lkml"
include: "../views/dim_client.view.lkml"
include: "../views/dim_user.view.lkml"

explore: account {
  extension: required
  view_name: fact
  join: dim_account {
    from: dim_account
    relationship: many_to_one
    view_label: "Accounts"
    sql_on: ${fact.account_id} = ${dim_account.id} ;;
  }
}

explore: client {
  extension: required
  view_name: fact
  join: dim_client {
    relationship: many_to_one
    view_label: "Clients"
    sql_on: ${fact.client_id} = ${dim_client.id} ;;
  }
}

explore: user {
  extension: required
  view_name: fact
  join: dim_user {
    relationship: many_to_one
    view_label: "Users"
    sql_on: ${fact.user_id} = ${dim_user.id} ;;
  }
}
