
# This view, when included in a model, will refine the foo view. View refinements starts on line 20 & 40
#
















view:
  +foo {
	dimension: extra {
		label: "Overriden"
	}
  }














view:
  +foo {
	dimension: new {}
  }
