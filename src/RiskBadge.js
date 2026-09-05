import { defineComponent, h } from 'vue';
import { badgeParts, styleString } from '@getnumra/browser';

/* A presentational badge. No fetching, no key, no opinion about your layout.

   A render function rather than a .vue single-file component, so this package
   needs no build step: what publishes to npm is what you can read here. The
   label, the colours and the geometry come from @getnumra/browser, shared with
   the React and Svelte packages — see there for why blacklisted outranks the
   band and why unrated has its own words. */

export const RiskBadge = defineComponent({
  name: 'RiskBadge',
  props: {
    /** The result from useNumraCheck. */
    check: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    /** The composable's `error`. Given one, the badge says the check did not run. */
    error: { type: null, default: null },
    showScore: { type: Boolean, default: false },
    /** Merged over the container. The base geometry survives. */
    badgeStyle: { type: Object, default: () => ({}) },
  },
  setup(props) {
    return () => {
      const b = badgeParts(props.check, {
        loading: props.loading,
        error: props.error,
        showScore: props.showScore,
        style: props.badgeStyle,
      });
      if (!b) return null;

      /* CSS strings, not the style objects. The shared objects use unitless
         numbers the way React writes them, and Vue — unlike React — does not
         append px: `width:7`, `border-radius:999` and `font-size:13` are all
         invalid, so the browser dropped them. The dot rendered 0×0 and the
         pill came out square. styleString() adds px where px is what the
         property means; Angular already used it for the same reason.

         role="status" because the badge appears and changes on its own while
         the operator is typing somewhere else; without a live region a
         screen-reader user never hears the verdict. No aria-label: the label
         is the text inside, and naming it twice reads it twice. */
      return h('span', { role: 'status', style: styleString(b.container) }, [
        h('span', { 'aria-hidden': 'true', style: styleString(b.dot) }),
        b.label,
        /* Only a real number. This tested `!== null`, and String(undefined)
           is the five letters "undefined" — printed beside "High risk" as if
           it were the score. */
        Number.isFinite(b.score)
          ? h('span', { style: styleString(b.scoreStyle) }, String(b.score))
          : null,
      ]);
    };
  },
});

export default RiskBadge;
