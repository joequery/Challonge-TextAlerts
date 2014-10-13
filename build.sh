# Outputs challonge_build.zip one level up
one_dir_up="$(dirname `pwd`)"
zip_path="$one_dir_up/challonge_build.zip"
echo "Exporting to $zip_path"
git archive --format zip --output $zip_path master
echo "Finished"
