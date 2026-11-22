#!/bin/bash
# Renders every video and still the app uses and drops them into ../app/assets.
# Videos are 1080x2348 (the iPhone 18 Pro's shape) so they fill the phone; the app copies are 720x1566.
#   ./scripts/build_app_assets.sh                 (everything)
#   ONLY="GunShow TheCoin" ./scripts/build_app_assets.sh   (just those compositions)
#   ONLY="Intro" / ONLY="Stills"
set -e
cd "$(dirname "$0")/.."
# the app's assets folder: ../app/assets in the working copy, ../assets in the GitHub repo (this folder is animations/)
if [ -d ../app/assets ]; then APP=../app/assets; else APP=../assets; fi
CHROME=${CHROME:-/usr/bin/google-chrome}
# CONCURRENCY=2 ./scripts/build_app_assets.sh  renders more frames in parallel
CONC=${CONCURRENCY:+--concurrency=$CONCURRENCY}
R="npx remotion"
mkdir -p out/videos out/frames "$APP/celebrations" "$APP/intro" "$APP/mascot" "$APP/icons" "$APP/demo"

# composition : app video id : poster time (s) : sample-feed photo? (1 = yes)
MAP="
Gym:gym-1:3.8:1
GunShow:gym-2:2.3:0
LegDay:gym-3:2.55:0
Atlas:gym-4:2.4:0
Mirror:gym-5:4.2:0
Run:run-1:2.2:1
FrostMiles:run-2:1.6:0
Torch:run-3:3.4:0
NightOwl:run-4:1.4:0
GooseChase:run-5:1.5:0
Jickle:jickle-1:2.2:1
Volo:volo-1:2.2:1
Soccer:soccer-1:2.2:1
Date:date-1:2.2:1
Beers:beers-1:2.2:1
Reading:reading-1:2.2:1
TheCoin:joke-coin:2.8:0
BlueHair:joke-bluehair:2.6:0
TheIron:joke-iron:1.0:0
MMA:mma-1:1.8:1
CrashOut:joke-crashout:2.0:0
SatelliteHouse:joke-satellite:3.6:0
TheBag:joke-bag:2.9:0
DylanFights:joke-fight:2.4:0
PukedOn:joke-puke:1.6:0
MMAGuy:joke-mma:1.4:0
TheRadiator:joke-radiator:2.3:0
JakesMom:joke-mom:1.3:0
NetsGame:joke-nets:2.3:0
LiquorRun:joke-liquor:3.4:0
PunxsutawneyPhil:joke-phil:2.0:0
ScaredOfGirls:joke-scared:1.2:0
TimeSheet:joke-timesheet:2.6:0
PullUp:gym-6:2.75:0
BoxJump:gym-7:2.8:0
RopeStorm:gym-8:1.9:0
GainsShake:gym-9:2.9:0
HammerTime:gym-10:2.45:0
RushHour:run-6:1.5:0
GreenLight:run-7:1.4:0
PigeonPanic:run-8:2.0:0
BridgeRun:run-9:2.9:0
CoffeeRun:run-10:1.7:0
MMAMainEvent:mma-2:2.75:0
MMAFlyingKnee:mma-3:1.75:0
MMAChamp:mma-4:2.4:0
JickleChef:jickle-2:3.2:0
JickleErne:jickle-3:1.17:0
JickleJickled:jickle-4:2.15:0
JickleQuick:jickle-5:1.55:0
BikeKOM:bike-1:2.1:0
BikeSendIt:bike-2:1.6:0
BikeSprint:bike-3:1.75:0
"
want() { [ -z "$ONLY" ] && return 0; for w in $ONLY; do [ "$w" = "$1" ] && return 0; done; return 1; }

for row in $MAP; do
  IFS=: read comp id poster photo <<< "$row"
  want "$comp" || continue
  master=(--crf=20 --x264-preset=veryfast)
  mobile=(-crf 26 -preset veryfast)
  downscale=scale=720:1566
  poster_quality=80
  case "$comp" in
    Gym|Atlas|Mirror)
      master=(--crf=17 --x264-preset=medium --image-format=png)
      mobile=(-crf 20 -preset slow)
      downscale=scale=720:1566:flags=lanczos,setsar=1
      poster_quality=90
      ;;
  esac
  $R render "$comp" "out/videos/$id.mp4" --codec=h264 "${master[@]}" --browser-executable="$CHROME" --log=error $CONC
  ffmpeg -y -loglevel error -i "out/videos/$id.mp4" -vf "$downscale" -c:v libx264 "${mobile[@]}" \
    -pix_fmt yuv420p -movflags +faststart -an "$APP/celebrations/$id.mp4"
  ffmpeg -y -loglevel error -ss "$poster" -i "out/videos/$id.mp4" -frames:v 1 -vf scale=360:782 -c:v libwebp -quality "$poster_quality" "$APP/celebrations/$id.webp"
  if [ "$photo" = "1" ]; then
    # square "proof photo" for the sample feed (the 1080x1920 design frame starts 214px down)
    cat=${id%-1}
    ffmpeg -y -loglevel error -ss 2.0 -i "out/videos/$id.mp4" -frames:v 1 -vf "crop=1080:1080:0:774,scale=720:720" -c:v libwebp -quality 78 "$APP/demo/$cat.webp"
  fi
  echo "done $id"
done
if [ -z "$ONLY" ] || want Intro; then
  $R render Intro out/videos/intro.mp4 --codec=h264 --crf=20 --x264-preset=veryfast --browser-executable="$CHROME" --log=error $CONC
  ffmpeg -y -loglevel error -i out/videos/intro.mp4 -vf scale=720:1566 -c:v libx264 -crf 27 -preset veryfast -pix_fmt yuv420p -movflags +faststart -an "$APP/intro/intro.mp4"
  ffmpeg -y -loglevel error -i out/videos/intro.mp4 -frames:v 1 -vf scale=720:1566 -c:v libwebp -quality 80 "$APP/intro/intro-first.webp"
  ffmpeg -y -loglevel error -sseof -0.05 -i out/videos/intro.mp4 -frames:v 1 -vf scale=720:1566 -c:v libwebp -quality 82 "$APP/intro/intro-last.webp"
  echo "done intro"
fi
if [ -z "$ONLY" ] || want Stills; then
  for pose in wave flex thumbs cheer shrug point head; do
    $R still Mascot "out/frames/mascot-$pose.png" --props="{\"pose\":\"$pose\"}" --browser-executable="$CHROME" --log=error
  done
  $R still AppIcon out/frames/app-icon.png --browser-executable="$CHROME" --log=error
  $R still AppIconMaskable out/frames/app-icon-maskable.png --browser-executable="$CHROME" --log=error
  python3 scripts/pack_stills.py "$APP"
  echo "done stills"
fi
