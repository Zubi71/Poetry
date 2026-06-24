import { createRoot, type Root } from 'react-dom/client';
import { RoomApp } from './RoomApp';
import { ListingApp } from './ListingApp';
import type { RoomMeta } from './lib/types';
import './styles/tailwind.css';

function mountRoom(container: HTMLElement, meta: RoomMeta): Root {
  const root = createRoot(container);
  root.render(<RoomApp meta={meta} />);
  return root;
}

function mountListing(container: HTMLElement): Root {
  const root = createRoot(container);
  root.render(<ListingApp />);
  return root;
}

function unmount(root: Root) {
  root.unmount();
}

window.MushairaRoomReact = { mountRoom, mountListing, unmount };
