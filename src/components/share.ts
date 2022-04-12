interface SideBar {
  title: string;
  href: string;
}

interface Share {
  sideBars?: SideBar[];
}

const globalShare: Share | undefined = (window as any)["bt-visual-share"];
export function getShareSideBars(): SideBar[] {
  return globalShare?.sideBars ?? [];
}
