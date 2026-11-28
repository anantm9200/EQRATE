'use client';
import type {EngineSource} from '@/lib/use-engine';

/** Always rendered (fixed footprint) so switching between engine, pending and browser states never shifts layout. */
export default function EngineProvenance({view,className}:{view:{source:EngineSource;label:string};className?:string}){
 return <span className={'cq-engine-provenance is-'+view.source+(className?' '+className:'')} data-engine-source={view.source} aria-live="polite">
  <span className="cq-engine-dot" aria-hidden="true"/>{view.label}
 </span>;
}
