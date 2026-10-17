export const customSymbolSizingCode = `
const Contact = ({ center = { x: 0, y: 0 }, ...size }) => (
  <symbol {...size}>
    <schematicpath points={Array.from({ length: 65 }, (_, pointIndex) => {
      const angle = pointIndex / 64 * 2 * Math.PI
      return { x: center.x + 0.5 * Math.cos(angle), y: center.y + 0.5 * Math.sin(angle) }
    })} strokeWidth={0.05} />
    <schematicline x1={center.x - 0.22} y1={center.y} x2={center.x + 0.22} y2={center.y} strokeWidth={0.05} />
    <schematicline x1={center.x} y1={center.y - 0.22} x2={center.x} y2={center.y + 0.22} strokeWidth={0.05} />
    <port name="pin1" pinNumber={1} direction="right" schX={center.x + 0.5} schY={center.y} />
  </symbol>
)
const Footprint = () => <footprint><smtpad shape="circle" radius={0.4} portHints={["pin1"]} /></footprint>
circuit.add(
  <board width={40} height={20} routingDisabled>
    <schematictext schX={-8} schY={-2} text="Legacy: stretched" fontSize={0.18} />
    <schematictext schX={-4} schY={-2} text="Width only: circular" fontSize={0.18} />
    <schematictext schX={0} schY={-2} text="Contain: circular" fontSize={0.18} />
    <schematictext schX={4} schY={-2} text="Local viewbox: 2 mm circle" fontSize={0.18} />
    <schematictext schX={8} schY={-2} text="Stretch: independent axes" fontSize={0.18} />
    <chip name="Legacy" schX={-8} pcbX={-8} footprint={<Footprint />} symbol={<Contact width={2} height={1.2} />} />
    <chip name="WidthOnly" schX={-4} pcbX={-4} footprint={<Footprint />} symbol={<Contact width={2} fit="contain" />} />
    <chip name="Contained" schX={0} pcbX={0} footprint={<Footprint />} symbol={<Contact width={2} height={1.2} fit="contain" />} />
    <chip name="LocalViewbox" schX={4} schY={2} pcbX={4} footprint={<Footprint />} symbol={<Contact center={{ x: 1, y: 2 }} width={2} fit="contain" viewbox={{ minX: 0.5, maxX: 1.5, minY: 1.5, maxY: 2.5 }} />} />
    <chip name="Stretched" schX={8} pcbX={8} footprint={<Footprint />} symbol={<Contact width={2} height={1.2} fit="stretch" viewbox={{ minX: -0.5, maxX: 0.5, minY: -0.5, maxY: 0.5 }} />} />
  </board>
)
`
