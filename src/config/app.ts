export const APP_NAME = "IEM Sync";
export const APP_TAGLINE = "Synchronized beat platform for music teams";
export const APP_DESCRIPTION =
  "One master clock. Local audio on every device. No streamed click.";

export const APP_METADATA = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: `${APP_TAGLINE} ${APP_DESCRIPTION}`,
} as const;
