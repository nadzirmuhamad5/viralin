/** Root Remotion — registrasi semua komposisi untuk bundler server-side.
 *  Durasi komposisi dihitung dari props via calculateMetadata. */
import React from "react";
import type { CalculateMetadataFunction } from "remotion";
import { Composition } from "remotion";
import { MotionStudio } from "./MotionStudio";
import { ViralKonten } from "./ViralKonten";
import {
  MOTION_FPS,
  motionDefaultProps,
  motionDurationFrames,
  type MotionStudioProps,
} from "../lib/motion";
import {
  VIRAL_FPS,
  viralDefaultProps,
  viralDurationFrames,
  type ViralKontenProps,
} from "../lib/viral";

export const calculateMotionDuration: CalculateMetadataFunction<MotionStudioProps> = ({ props }) => ({
  durationInFrames: Math.max(motionDurationFrames(props), 30),
  fps: MOTION_FPS,
  width: 540,
  height: 960,
});

export const calculateViralDuration: CalculateMetadataFunction<ViralKontenProps> = ({ props }) => ({
  durationInFrames: viralDurationFrames(props),
  fps: VIRAL_FPS,
  width: 540,
  height: 960,
});

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MotionStudio"
        component={MotionStudio}
        durationInFrames={195}
        fps={MOTION_FPS}
        width={540}
        height={960}
        defaultProps={motionDefaultProps()}
        calculateMetadata={calculateMotionDuration}
      />
      <Composition
        id="ViralKonten"
        component={ViralKonten}
        durationInFrames={150}
        fps={VIRAL_FPS}
        width={540}
        height={960}
        defaultProps={viralDefaultProps()}
        calculateMetadata={calculateViralDuration}
      />
    </>
  );
};
