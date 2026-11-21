import './fonts';
import { Composition, Folder, Still } from 'remotion';
import { ModelSheet, HeroBig, FaceSheet, StyleSheet } from './sheets/ModelSheet';
import { GymScene } from './scenes/Gym';
import { RunScene } from './scenes/Run';
import { JickleScene } from './scenes/Jickle';
import { VoloScene } from './scenes/Volo';
import { SoccerScene } from './scenes/Soccer';
import { DateScene } from './scenes/Date';
import { BeersScene } from './scenes/Beers';
import { ReadingScene } from './scenes/Reading';
import { MascotStill, AppIcon, AppIconMaskable, IntroScene } from './app/AppArt';
import { GunShowScene } from './scenes/GunShow';
import { LegDayScene } from './scenes/LegDay';
import { AtlasScene } from './scenes/Atlas';
import { MirrorScene } from './scenes/Mirror';
import { FrostMilesScene } from './scenes/FrostMiles';
import { TorchScene } from './scenes/Torch';
import { NightOwlScene } from './scenes/NightOwl';
import { GooseChaseScene } from './scenes/GooseChase';
import { JokeCoinScene, COIN_FRAMES } from './scenes/JokeCoin';
import { JokeBlueHairScene, BLUE_FRAMES } from './scenes/JokeBlueHair';
import { JokeIronScene, IRON_FRAMES } from './scenes/JokeIron';
import { JokeCrashOutScene, CRASH_FRAMES } from './scenes/JokeCrashOut';
import { MMAScene, MMA_CEL_FRAMES } from './scenes/MMA';
import { JokeScaredScene, SCARED_FRAMES } from './scenes/JokeScared';
import { JokePhilScene, PHIL_FRAMES } from './scenes/JokePhil';
import { JokeSatelliteScene, SAT_FRAMES } from './scenes/JokeSatellite';
import { JokeNetsScene, NETS_FRAMES } from './scenes/JokeNets';
import { JokeBagScene, BAG_FRAMES } from './scenes/JokeBag';
import { JokeFightScene, FIGHT_FRAMES } from './scenes/JokeFight';
import { JokePukeScene, PUKE_FRAMES } from './scenes/JokePuke';
import { JokeMMAScene, MMA_FRAMES } from './scenes/JokeMMA';
import { JokeLiquorScene, LIQUOR_FRAMES } from './scenes/JokeLiquor';
import { JokeMomScene, MOM_FRAMES } from './scenes/JokeMom';
import { JokeRadiatorScene, RADIATOR_FRAMES } from './scenes/JokeRadiator';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Sheets">
        <Still id="ModelSheet" component={ModelSheet} width={2400} height={1000} />
        <Still id="HeroBig" component={HeroBig} width={1080} height={1920} />
        <Still id="FaceSheet" component={FaceSheet} width={2400} height={1300} />
        <Still id="StyleSheet" component={StyleSheet} width={1080} height={1920} />
      </Folder>
      <Folder name="AppArt">
        <Still id="Mascot" component={MascotStill} width={900} height={1200} defaultProps={{ pose: 'wave' }} />
        <Still id="AppIcon" component={AppIcon} width={1024} height={1024} />
        <Still id="AppIconMaskable" component={AppIconMaskable} width={1024} height={1024} />
        <Composition id="Intro" component={IntroScene} durationInFrames={84} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="Celebrations">
        <Composition id="Gym" component={GymScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="Run" component={RunScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="Jickle" component={JickleScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="Volo" component={VoloScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="Soccer" component={SoccerScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="Date" component={DateScene} durationInFrames={150} fps={30} width={1080} height={1920} />
        <Composition id="Beers" component={BeersScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="Reading" component={ReadingScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="MMA" component={MMAScene} durationInFrames={MMA_CEL_FRAMES} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="MoreGym">
        <Composition id="GunShow" component={GunShowScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="LegDay" component={LegDayScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="Atlas" component={AtlasScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="Mirror" component={MirrorScene} durationInFrames={135} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="MoreRun">
        <Composition id="FrostMiles" component={FrostMilesScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="Torch" component={TorchScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="NightOwl" component={NightOwlScene} durationInFrames={135} fps={30} width={1080} height={1920} />
        <Composition id="GooseChase" component={GooseChaseScene} durationInFrames={135} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="InsideJokes">
        <Composition id="TheCoin" component={JokeCoinScene} durationInFrames={COIN_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="BlueHair" component={JokeBlueHairScene} durationInFrames={BLUE_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="TheIron" component={JokeIronScene} durationInFrames={IRON_FRAMES} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="MoreJokes">
        <Composition id="CrashOut" component={JokeCrashOutScene} durationInFrames={CRASH_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="TheRadiator" component={JokeRadiatorScene} durationInFrames={RADIATOR_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="JakesMom" component={JokeMomScene} durationInFrames={MOM_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="LiquorRun" component={JokeLiquorScene} durationInFrames={LIQUOR_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="MMAGuy" component={JokeMMAScene} durationInFrames={MMA_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="PukedOn" component={JokePukeScene} durationInFrames={PUKE_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="DylanFights" component={JokeFightScene} durationInFrames={FIGHT_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="TheBag" component={JokeBagScene} durationInFrames={BAG_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="NetsGame" component={JokeNetsScene} durationInFrames={NETS_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="SatelliteHouse" component={JokeSatelliteScene} durationInFrames={SAT_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="PunxsutawneyPhil" component={JokePhilScene} durationInFrames={PHIL_FRAMES} fps={30} width={1080} height={1920} />
        <Composition id="ScaredOfGirls" component={JokeScaredScene} durationInFrames={SCARED_FRAMES} fps={30} width={1080} height={1920} />
      </Folder>
    </>
  );
};
