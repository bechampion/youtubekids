# youtubekids
## how to download:
```bash
yt-dlp --sleep-interval 3 --concurrent-fragments 10 --download-archive downloaded.txt --write-thumbnail "https://www.youtube.com/results?search_query=toy+story" --cookies-from-browser firefox
```
Then generate the thumbnails:
```bash
~/Projects/youtubekids main*
./generate_thumbnails_fixed.sh
```

