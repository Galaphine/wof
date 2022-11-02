#!/bin/bash

while getopts v:c: flag
do
    case "${flag}" in
        v) version=${OPTARG};;
        c) comment=${OPTARG};;
    esac
done

zip wof-v$version.zip v$version/* -r
git add -A *
git commit -m "$comment"
git push -u origin master
