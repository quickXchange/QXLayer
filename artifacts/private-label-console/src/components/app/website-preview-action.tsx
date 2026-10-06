import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useGetTenantWebsitePreview, getGetTenantWebsitePreviewQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function WebsitePreviewAction({ tenantId }: { tenantId: string }) {
  const [href, setHref] = useState<string | null>(null);
  const { toast } = useToast();
  const preview = useGetTenantWebsitePreview(tenantId, { query: { queryKey: getGetTenantWebsitePreviewQueryKey(tenantId), enabled: false, retry: false } });
  const open = async () => {
    // Create the tab inside the click gesture, before awaiting authorization,
    // so desktop/mobile popup blockers do not suppress the website preview.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    const result = await preview.refetch();
    if (!result.data || result.error) {
      tab?.close();
      toast({ title: "Website preview unavailable", description: result.error instanceof Error ? result.error.message : "Please try again.", variant: "destructive" });
      return;
    }
    setHref(result.data.url);
    if (tab) tab.location.replace(result.data.url);
    else toast({ title: "Preview ready", description: "Use Open Website below if your browser blocked the new tab." });
  };
  return <div className="flex flex-wrap items-center gap-3">
    <Button type="button" variant="outline" onClick={open} disabled={preview.isFetching} data-testid="button-preview-website">
      {preview.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
      Preview Website
    </Button>
    {href && <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm underline" data-testid="link-open-website">Open Website</a>}
  </div>;
}
