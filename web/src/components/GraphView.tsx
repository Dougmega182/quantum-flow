import { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { api } from "../lib/api";

export function GraphView() {
    const [data, setData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await api.projectGraphData();
                setData(res);
            } catch (e) {
                console.error("Failed to load graph data", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div style={{ padding: 40, opacity: 0.5 }}>Generating graph...</div>;

    return (
        <div style={{ height: "100%", backgroundColor: "#fafafa", borderRadius: 16, border: "1px solid #f1f5f9", overflow: "hidden" }}>
            <ForceGraph2D
                graphData={data}
                nodeLabel="name"
                nodeAutoColorBy="id"
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={d => (d as any).val * 0.001}
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = (node as any).name;
                    const fontSize = 12 / globalScale;
                    ctx.font = `${fontSize}px Inter, system-ui`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions: [number, number] = [textWidth, fontSize].map(n => n + fontSize * 0.2) as [number, number];

                    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                    ctx.fillRect(node.x! - bckgDimensions[0] / 2, node.y! - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#1e293b";
                    ctx.fillText(label, node.x!, node.y!);

                    (node as any).__bckgDimensions = bckgDimensions;
                }}
                nodePointerAreaPaint={(node, color, ctx) => {
                    ctx.fillStyle = color;
                    const bckgDimensions = (node as any).__bckgDimensions;
                    if (bckgDimensions) {
                        ctx.fillRect(node.x! - bckgDimensions[0] / 2, node.y! - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                    }
                }}
            />
        </div>
    );
}
