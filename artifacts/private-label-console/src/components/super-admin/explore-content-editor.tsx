import { useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useListPlans, useUpdateLandingProduct, getListPlansQueryKey, getListLandingProductsQueryKey, getGetPublicProductCatalogQueryKey, type LandingProduct, type ProductExploreContent } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type PointsKey = 'features' | 'benefits' | 'steps' | 'integrations' | 'useCases';
const SECTIONS: { key: PointsKey; label: string; limit: number }[] = [
  { key: 'features', label: 'Features', limit: 16 }, { key: 'benefits', label: 'Benefits', limit: 12 },
  { key: 'steps', label: 'How It Works', limit: 8 }, { key: 'integrations', label: 'Integrations', limit: 16 },
  { key: 'useCases', label: 'Use cases', limit: 12 },
];
function move<T>(items: T[], index: number, direction: number): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy;
}
export function ExploreContentEditor({ product, onClose }: { product: LandingProduct; onClose: () => void }) {
  const [content, setContent] = useState<ProductExploreContent>(() => structuredClone(product.explore!));
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('hero');
  const mutation = useUpdateLandingProduct();
  const planQuery = useListPlans({ query: { queryKey: getListPlansQueryKey(), enabled: product.key === 'crypto_exchange' } });
  const qc = useQueryClient(); const { toast } = useToast();
  const set = <K extends keyof ProductExploreContent>(key: K, value: ProductExploreContent[K]) => setContent(c => ({ ...c, [key]: value }));
  function save() {
    setError(null);
    mutation.mutate({ productKey: product.key, data: { ...product, explore: content } }, {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getListLandingProductsQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetPublicProductCatalogQueryKey() });
        void qc.invalidateQueries({ queryKey: ['public', 'plan-proposals'] });
        toast({ title: 'Explore page saved', description: 'The public page will refresh with the updated content.' }); onClose();
      },
      onError: err => setError((err as Error).message || 'Could not save the Explore page.'),
    });
  }
  const section = SECTIONS.find(s => s.key === tab);
  return <Dialog open onOpenChange={open => !open && !mutation.isPending && onClose()}>
    <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto" data-testid="dialog-explore-content">
      <DialogHeader><DialogTitle>Edit Explore page · {product.name}</DialogTitle><DialogDescription>Public marketing only. These fields never grant entitlements, connect services, or change pricing. <Link href={`/products/${product.key}`} target="_blank" className="underline">Preview page</Link></DialogDescription></DialogHeader>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Explore content sections">
        {[{ key: 'hero', label: 'Hero & experience' }, ...SECTIONS, { key: 'gallery', label: 'Images' }, { key: 'faqs', label: 'FAQ' }, ...(product.key === 'crypto_exchange' ? [{ key: 'pricing', label: 'Pricing tiers' }] : [])].map(t =>
          <Button key={t.key} size="sm" role="tab" aria-selected={tab === t.key} variant={tab === t.key ? 'default' : 'outline'} onClick={() => setTab(t.key)}>{t.label}</Button>)}
      </div>
      {tab === 'hero' && <div className="space-y-4">
        {product.key === 'crypto_exchange' && <fieldset className="space-y-3 rounded-lg border p-4"><legend className="px-1 text-sm">Platform landing hero</legend>
          <div><Label htmlFor="landing-headline">Landing headline</Label><Input id="landing-headline" value={content.landingHeadline ?? ''} maxLength={180} onChange={e => set('landingHeadline', e.target.value)} /></div>
          <div><Label htmlFor="landing-summary">Landing introduction</Label><Textarea id="landing-summary" value={content.landingSummary ?? ''} maxLength={1200} rows={3} onChange={e => set('landingSummary', e.target.value)} /></div>
        </fieldset>}
        <div><Label htmlFor="explore-eyebrow">Eyebrow</Label><Input id="explore-eyebrow" value={content.eyebrow} maxLength={120} onChange={e => set('eyebrow', e.target.value)} /></div>
        <div><Label htmlFor="explore-headline">Headline</Label><Input id="explore-headline" value={content.headline} maxLength={180} onChange={e => set('headline', e.target.value)} /></div>
        <div><Label htmlFor="explore-summary">Introduction</Label><Textarea id="explore-summary" value={content.summary} maxLength={1200} rows={4} onChange={e => set('summary', e.target.value)} /></div>
        <div><Label htmlFor="explore-hero-image">Hero image · public HTTPS URL</Label><Input id="explore-hero-image" type="url" value={content.heroImageUrl} maxLength={2048} placeholder="https://…" onChange={e => set('heroImageUrl', e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Leave blank for the authored product interface. Use public artwork, never credentials, private or signed links. Describe its purpose in the introduction.</p></div>
        <div><Label htmlFor="explore-experience">Customer experience</Label><Textarea id="explore-experience" value={content.customerExperience} rows={5} maxLength={1600} onChange={e => set('customerExperience', e.target.value)} /></div>
      </div>}
      {section && <div className="space-y-3">
        {content[section.key].map((point, index) => <fieldset key={`${section.key}-${index}`} className="space-y-2 rounded-lg border p-4">
          <legend className="px-1 text-sm">{section.label} {index + 1}</legend>
          <div className="flex gap-2"><Input aria-label={`${section.label} ${index + 1} title`} value={point.title} maxLength={120} onChange={e => set(section.key, content[section.key].map((p, i) => i === index ? { ...p, title: e.target.value } : p))} />
            <Button variant="outline" size="icon" aria-label="Move up" disabled={index === 0} onClick={() => set(section.key, move(content[section.key], index, -1))}><ArrowUp size={15} /></Button>
            <Button variant="outline" size="icon" aria-label="Move down" disabled={index === content[section.key].length - 1} onClick={() => set(section.key, move(content[section.key], index, 1))}><ArrowDown size={15} /></Button>
            <Button variant="outline" size="icon" aria-label={`Remove ${section.label} ${index + 1}`} onClick={() => set(section.key, content[section.key].filter((_, i) => i !== index))}><Trash2 size={15} /></Button>
          </div>
          <Textarea aria-label={`${section.label} ${index + 1} description`} value={point.body} maxLength={1200} rows={3} onChange={e => set(section.key, content[section.key].map((p, i) => i === index ? { ...p, body: e.target.value } : p))} />
        </fieldset>)}
        <Button variant="outline" disabled={content[section.key].length >= section.limit} onClick={() => set(section.key, [...content[section.key], { title: '', body: '' }])}><Plus size={15} className="mr-2" />Add {section.label.toLowerCase()}</Button>
      </div>}
      {tab === 'gallery' && <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Additional images are presented alongside the authored showcases. Empty URLs use the product illustration. Public HTTPS only.</p>
        {content.gallery.map((image, index) => <fieldset key={index} className="space-y-2 rounded-lg border p-4">
          <legend>Image {index + 1}</legend>
          <Input aria-label={`Image ${index + 1} title`} placeholder="Image title / accessible description" maxLength={120} value={image.title} onChange={e => set('gallery', content.gallery.map((p, i) => i === index ? { ...p, title: e.target.value } : p))} />
          <Input aria-label={`Image ${index + 1} URL`} placeholder="Public HTTPS URL" maxLength={2048} value={image.imageUrl} onChange={e => set('gallery', content.gallery.map((p, i) => i === index ? { ...p, imageUrl: e.target.value } : p))} />
          <Textarea aria-label={`Image ${index + 1} caption`} maxLength={700} value={image.caption} placeholder="Caption" onChange={e => set('gallery', content.gallery.map((p, i) => i === index ? { ...p, caption: e.target.value } : p))} />
          <div className="flex gap-2"><Button variant="outline" size="sm" disabled={index === 0} onClick={() => set('gallery', move(content.gallery, index, -1))}>Move up</Button><Button variant="outline" size="sm" disabled={index === content.gallery.length - 1} onClick={() => set('gallery', move(content.gallery, index, 1))}>Move down</Button><Button variant="outline" size="sm" onClick={() => set('gallery', content.gallery.filter((_, i) => i !== index))}>Remove image</Button></div>
        </fieldset>)}
        <Button variant="outline" disabled={content.gallery.length >= 12} onClick={() => set('gallery', [...content.gallery, { title: '', caption: '', imageUrl: '' }])}><Plus size={15} className="mr-2" />Add image</Button>
      </div>}
      {tab === 'faqs' && <div className="space-y-3">
        {content.faqs.map((faq, index) => <fieldset key={index} className="space-y-2 rounded-lg border p-4">
          <legend>Question {index + 1}</legend><Input aria-label={`FAQ ${index + 1} question`} value={faq.question} maxLength={200} onChange={e => set('faqs', content.faqs.map((p, i) => i === index ? { ...p, question: e.target.value } : p))} />
          <Textarea aria-label={`FAQ ${index + 1} answer`} value={faq.answer} maxLength={1600} rows={4} onChange={e => set('faqs', content.faqs.map((p, i) => i === index ? { ...p, answer: e.target.value } : p))} />
          <div className="flex gap-2"><Button variant="outline" size="sm" disabled={index === 0} onClick={() => set('faqs', move(content.faqs, index, -1))}>Move up</Button><Button variant="outline" size="sm" disabled={index === content.faqs.length - 1} onClick={() => set('faqs', move(content.faqs, index, 1))}>Move down</Button><Button variant="outline" size="sm" onClick={() => set('faqs', content.faqs.filter((_, i) => i !== index))}>Remove question</Button></div>
        </fieldset>)}
        <Button variant="outline" disabled={content.faqs.length >= 16} onClick={() => set('faqs', [...content.faqs, { question: '', answer: '' }])}><Plus size={15} className="mr-2" />Add question</Button>
      </div>}
      {tab === 'pricing' && <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Select existing plans for the three preliminary EUR cards. Prices, features, limits and modules are managed in <Link href="/plans" className="underline">Plans</Link>. Only disabled, unconfigured EUR proposals are shown here; approved published offers always take priority. This does not enable checkout.</p>
        {planQuery.isError && <p role="alert">Could not load Plans. <button className="underline" onClick={() => planQuery.refetch()}>Retry</button></p>}
        {(content.pricingTiers ?? []).map((tier, index) => <fieldset key={index} className="space-y-2 rounded-lg border p-4"><legend>Tier {index + 1}</legend>
          <Label htmlFor={`tier-${index}-label`}>Display name</Label><Input id={`tier-${index}-label`} value={tier.label} maxLength={60} onChange={e => set('pricingTiers', content.pricingTiers!.map((t, i) => i === index ? { ...t, label: e.target.value } : t))} />
          <Label htmlFor={`tier-${index}-plan`}>Existing plan</Label><select id={`tier-${index}-plan`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={tier.planId ?? ''} onChange={e => set('pricingTiers', content.pricingTiers!.map((t, i) => i === index ? { ...t, planId: e.target.value || null } : t))}><option value="">No proposal selected</option>{(planQuery.data ?? []).map(p => <option key={p.id} value={p.id}>{p.name} · {p.currency} · {p.status}</option>)}</select>
        </fieldset>)}
      </div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button onClick={save} disabled={mutation.isPending} data-testid="button-save-explore">{mutation.isPending ? 'Saving…' : 'Save Explore page'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
