import Image from 'next/image';

export function GallerySection({ urls }: { urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <section id="gallery" className="py-20 px-6 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-10">Gallery</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{urls.map((u, i) => <div key={u} className="relative aspect-video overflow-hidden rounded-lg"><Image src={u} alt={`Project gallery image ${i + 1}`} fill className="object-cover" sizes="(min-width: 1024px) 33vw, 50vw" /></div>)}</div>
      </div>
    </section>
  );
}
