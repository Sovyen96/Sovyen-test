export const meta = () => [
  {title: 'Historia · Mónica Lazcano'},
  {
    name: 'description',
    content:
      'Tres generaciones produciendo mezcal en San Baltazar Guelavila, Oaxaca. La historia de la casa Lazcano contada por su maestra mezcalera.',
  },
];

export default function Historia() {
  return (
    <>
      <section className="relative h-[70vh] min-h-[480px] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=2400&q=85"
            alt="Campo de agaves al atardecer en Oaxaca"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-charcoal)]/80 to-transparent" />
        </div>
        <div className="container-edge relative pb-20 text-[var(--color-bone)]">
          <p className="eyebrow text-[var(--color-clay)] mb-5">Casa Lazcano</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] max-w-3xl">
            Tres generaciones,<br />un mismo palenque.
          </h1>
        </div>
      </section>

      <section className="container-edge py-28">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-7 md:col-start-3 space-y-8 text-lg leading-relaxed text-[var(--color-charcoal-soft)]">
            <p className="font-display text-3xl text-[var(--color-charcoal)] leading-snug">
              En 1948, mi abuelo Tomás encendió un horno de tierra en San Baltazar
              Guelavila. Ese horno no se ha apagado desde entonces.
            </p>

            <p>
              Mi padre, Don Atenógenes, aprendió de él. Yo aprendí de mi padre.
              Cada mezcal de nuestra casa lleva esa cadena: un agave que esperó
              quince años, una piña que pasó seis días bajo tierra, una tahona de
              piedra movida a mano, y ocho días esperando a que el aire de
              Oaxaca decida cuándo está listo.
            </p>

            <p>
              No producimos rápido. No podemos. El agave decide.
            </p>

            <p>
              Por eso nuestros lotes son pequeños y siempre numerados. Por eso a
              veces no hay botellas durante meses. Y por eso, cuando abres una,
              estás abriendo el tiempo de toda una familia.
            </p>

            <p className="font-display text-2xl text-[var(--color-clay-deep)] pt-4">
              — Mónica Lazcano, maestra mezcalera
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bone-soft)] py-24">
        <div className="container-edge grid md:grid-cols-3 gap-10">
          <Pillar
            year="1948"
            title="El primer horno"
            text="Tomás Lazcano enciende el palenque familiar en San Baltazar Guelavila."
          />
          <Pillar
            year="1982"
            title="Segunda generación"
            text="Don Atenógenes hereda el oficio y empieza a embotellar para terceros."
          />
          <Pillar
            year="2019"
            title="La casa propia"
            text="Mónica funda Casa Lazcano. Primer mezcal embotellado bajo el nombre de la familia."
          />
        </div>
      </section>
    </>
  );
}

function Pillar({year, title, text}: {year: string; title: string; text: string}) {
  return (
    <div>
      <p className="font-display text-5xl text-[var(--color-clay-deep)] mb-4">{year}</p>
      <h3 className="font-display text-2xl mb-3">{title}</h3>
      <p className="text-[var(--color-charcoal-soft)] leading-relaxed">{text}</p>
    </div>
  );
}
