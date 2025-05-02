export const triangleArray = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 3, 1, 1, 3, 6]);
export const solarData = {
  data: [
    {
      altitude_deg: 45,
      azimuth_deg: 45,
      average_radiance_W_m2_sr: 10,
    },
    {
      altitude_deg: 45,
      azimuth_deg: 315,
      average_radiance_W_m2_sr: 20,
    },
  ],
  metadata: {
    latitude: 48.2,
    longitude: 11.6,
    total_timesteps_in_period: 8760,
    valid_timesteps_for_aggregation: 8760,
  },
};
export const skysegmentDirectionArray = new Float32Array([1, 0, 0, 0, 0, 1, 0, 1 / Math.sqrt(2), 1 / 1 / Math.sqrt(2)]);
