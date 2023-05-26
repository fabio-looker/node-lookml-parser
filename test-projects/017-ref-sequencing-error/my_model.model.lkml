# Although test project #013 did a fairly thorough job of testing refinement sequencing,
# it did not test it in the context of a model assembled from multiple files. And, it turned
# out that the model assembly logic was merging refinement arrays as though they were a an object,
# later breaking the refinement code. See LAMS issue #134 for more details

include: "*.explore"
