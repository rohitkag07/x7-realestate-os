export function GallerySection({ urls }: { urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <section id="gallery" className="py-20 px-6 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-10">Gallery</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{urls.map((u, i) => <img key={i} src={u} alt="" className="rounded-lg aspect-video object-cover w-full" loading="lazy" />)}</div>
      </div>
    </section>
  );
}
