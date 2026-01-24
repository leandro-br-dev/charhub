import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { VisualStyle, Theme } from '../generated/prisma';

export interface StyleThemeCombination {
  style: VisualStyle;
  theme: Theme;
  checkpoint: {
    id: string;
    name: string;
    filename: string;
    path: string;
  };
  lora?: {
    id: string;
    name: string;
    filename: string;
    filepathRelative: string;
    strength: number;
  };
}

export class StyleThemeService {
  /**
   * Get checkpoint + LoRA configuration for a Style + Theme combination
   */
  async getCombination(style: VisualStyle, theme: Theme): Promise<StyleThemeCombination | null> {
    try {
      const combo = await prisma.styleThemeCheckpoint.findUnique({
        where: {
          styleId_theme: {
            styleId: (await this.getStyleConfigId(style)),
            theme,
          },
        },
        include: {
          checkpoint: true,
          loraOverride: true,
        },
      });

      if (!combo) {
        logger.warn({ style, theme }, 'Style + Theme combination not found');
        return null;
      }

      return {
        style,
        theme,
        checkpoint: {
          id: combo.checkpoint.id,
          name: combo.checkpoint.name,
          filename: combo.checkpoint.filename,
          path: combo.checkpoint.path,
        },
        lora: combo.loraOverride ? {
          id: combo.loraOverride.id,
          name: combo.loraOverride.name,
          filename: combo.loraOverride.filename,
          filepathRelative: combo.loraOverride.filepathRelative!,
          strength: combo.loraStrength || combo.loraOverride.weight,
        } : undefined,
      };
    } catch (error) {
      logger.error({ error, style, theme }, 'Failed to get Style + Theme combination');
      return null;
    }
  }

  /**
   * Get all available themes for a style
   */
  async getAvailableThemes(style: VisualStyle): Promise<Theme[]> {
    try {
      const styleConfig = await prisma.visualStyleConfig.findUnique({
        where: { style },
        select: { supportedThemes: true },
      });

      return styleConfig?.supportedThemes || [];
    } catch (error) {
      logger.error({ error, style }, 'Failed to get available themes');
      return [];
    }
  }

  /**
   * Get all styles with their supported themes
   */
  async getAllStyles(): Promise<
    Array<{
      style: VisualStyle;
      name: string;
      description: string | null;
      supportedThemes: Theme[];
    }>
  > {
    try {
      const styles = await prisma.visualStyleConfig.findMany({
        where: { isActive: true },
        select: {
          style: true,
          name: true,
          description: true,
          supportedThemes: true,
        },
        orderBy: { style: 'asc' },
      });

      return styles;
    } catch (error) {
      logger.error({ error }, 'Failed to get all styles');
      return [];
    }
  }

  /**
   * Get style config ID from enum
   */
  private async getStyleConfigId(style: VisualStyle): Promise<string> {
    const styleConfig = await prisma.visualStyleConfig.findUnique({
      where: { style },
      select: { id: true },
    });

    if (!styleConfig) {
      throw new Error(`Style config not found for: ${style}`);
    }

    return styleConfig.id;
  }
}

export const styleThemeService = new StyleThemeService();
