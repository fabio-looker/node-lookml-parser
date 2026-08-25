include: "*.view.lkml"

view: facts {
    dimension: foo {
        link: {url: "https://go.foo/"}
        label: "Description links continue below..."
        link: {url: "https://x.foo/"}
    }
}

view: +fact {
    label: "Two"
}

include: "*.dashboard.lkml"

view: +fact {
    label: "Three"
}
