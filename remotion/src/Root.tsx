import { Composition } from 'remotion';
import { PropertyWalkthrough, propsSchemaWalkthrough, defaultWalkthroughProps } from './compositions/PropertyWalkthrough';
import { PriceReveal, propsSchemaPriceReveal, defaultPriceRevealProps } from './compositions/PriceReveal';
import { LocationExplainer, propsSchemaLocation, defaultLocationProps } from './compositions/LocationExplainer';
import { ConstructionUpdate, propsSchemaConstruction, defaultConstructionProps } from './compositions/ConstructionUpdate';
import { TestimonialReel, propsSchemaTestimonial, defaultTestimonialProps } from './compositions/TestimonialReel';
import { BeforeAfter, propsSchemaBeforeAfter, defaultBeforeAfterProps } from './compositions/BeforeAfter';
import { InvestmentComparison, propsSchemaInvestment, defaultInvestmentProps } from './compositions/InvestmentComparison';
import { FestivalCreative, propsSchemaFestival, defaultFestivalProps } from './compositions/FestivalCreative';
import { AdCreative, propsSchemaAd, defaultAdProps } from './compositions/AdCreative';
import { PRESETS } from './utils/platformPresets';

export const Root: React.FC = () => (
  <>
    <Composition id="PropertyWalkthrough-16x9" component={PropertyWalkthrough} durationInFrames={PRESETS['16x9'].fps * 30} fps={PRESETS['16x9'].fps} width={PRESETS['16x9'].width} height={PRESETS['16x9'].height} schema={propsSchemaWalkthrough} defaultProps={defaultWalkthroughProps} />
    <Composition id="PropertyWalkthrough-9x16" component={PropertyWalkthrough} durationInFrames={PRESETS['9x16'].fps * 30} fps={PRESETS['9x16'].fps} width={PRESETS['9x16'].width} height={PRESETS['9x16'].height} schema={propsSchemaWalkthrough} defaultProps={defaultWalkthroughProps} />
    <Composition id="PriceReveal-9x16" component={PriceReveal} durationInFrames={PRESETS['9x16'].fps * 15} fps={PRESETS['9x16'].fps} width={PRESETS['9x16'].width} height={PRESETS['9x16'].height} schema={propsSchemaPriceReveal} defaultProps={defaultPriceRevealProps} />
    <Composition id="PriceReveal-1x1" component={PriceReveal} durationInFrames={PRESETS['1x1'].fps * 15} fps={PRESETS['1x1'].fps} width={PRESETS['1x1'].width} height={PRESETS['1x1'].height} schema={propsSchemaPriceReveal} defaultProps={defaultPriceRevealProps} />
    <Composition id="LocationExplainer-9x16" component={LocationExplainer} durationInFrames={PRESETS['9x16'].fps * 45} fps={PRESETS['9x16'].fps} width={PRESETS['9x16'].width} height={PRESETS['9x16'].height} schema={propsSchemaLocation} defaultProps={defaultLocationProps} />
    <Composition id="ConstructionUpdate-9x16" component={ConstructionUpdate} durationInFrames={PRESETS['9x16'].fps * 30} fps={PRESETS['9x16'].fps} width={PRESETS['9x16'].width} height={PRESETS['9x16'].height} schema={propsSchemaConstruction} defaultProps={defaultConstructionProps} />
    <Composition id="TestimonialReel-9x16" component={TestimonialReel} durationInFrames={PRESETS['9x16'].fps * 45} fps={PRESETS['9x16'].fps} width={PRESETS['9x16'].width} height={PRESETS['9x16'].height} schema={propsSchemaTestimonial} defaultProps={defaultTestimonialProps} />
    <Composition id="BeforeAfter-9x16" component={BeforeAfter} durationInFrames={PRESETS['9x16'].fps * 20} fps={PRESETS['9x16'].fps} width={PRESETS['9x16'].width} height={PRESETS['9x16'].height} schema={propsSchemaBeforeAfter} defaultProps={defaultBeforeAfterProps} />
    <Composition id="InvestmentComparison-1x1" component={InvestmentComparison} durationInFrames={PRESETS['1x1'].fps * 25} fps={PRESETS['1x1'].fps} width={PRESETS['1x1'].width} height={PRESETS['1x1'].height} schema={propsSchemaInvestment} defaultProps={defaultInvestmentProps} />
    <Composition id="FestivalCreative-1x1" component={FestivalCreative} durationInFrames={PRESETS['1x1'].fps * 10} fps={PRESETS['1x1'].fps} width={PRESETS['1x1'].width} height={PRESETS['1x1'].height} schema={propsSchemaFestival} defaultProps={defaultFestivalProps} />
    <Composition id="AdCreative-9x16" component={AdCreative} durationInFrames={PRESETS['9x16'].fps * 15} fps={PRESETS['9x16'].fps} width={PRESETS['9x16'].width} height={PRESETS['9x16'].height} schema={propsSchemaAd} defaultProps={defaultAdProps} />
  </>
);
