import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect, Group } from 'react-konva';
import { useStore } from '../store';
import useImage from 'use-image';

const A4_WIDTH = 794; // 210mm at 96dpi
const A4_HEIGHT = 1123; // 297mm at 96dpi

const CanvasPreview = ({ id = "placa" }: { id?: string }) => {
  const { 
    textElements1, textElements2, textElements3,
    productImage1, productImage2, productImage3,
    background, setElement, setProductImage,
    zoom, setZoom,
    selectedId, setSelectedId,
    isPrinting
  } = useStore();
  const stageRef = useRef<any>(null);
  const productImg1Ref = useRef<any>(null);
  const productImg2Ref = useRef<any>(null);
  const productImg3Ref = useRef<any>(null);
  const trRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [bgImg] = useImage(background.url || '', 'anonymous');
  const [prodImg1] = useImage(productImage1.url || '', 'anonymous');
  const [prodImg2] = useImage(productImage2.url || '', 'anonymous');
  const [prodImg3] = useImage(productImage3.url || '', 'anonymous');
  const [autoScale, setAutoScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      if (!container) return;
      const margin = 20; // Reduced margin
      const containerWidth = container.clientWidth - margin;
      const containerHeight = container.clientHeight - margin;
      
      if (containerWidth <= 0 || containerHeight <= 0) return;

      const scaleW = containerWidth / A4_WIDTH;
      const scaleH = containerHeight / A4_HEIGHT;
      
      const newScale = Math.min(scaleW, scaleH);
      setAutoScale(newScale);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });

    resizeObserver.observe(container);
    // Initial update with a small delay to ensure container is ready
    const timer = setTimeout(updateScale, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (selectedId && trRef.current) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne('#' + selectedId);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        trRef.current.getLayer().batchDraw();
      } else {
        trRef.current.nodes([]);
      }
    } else if (trRef.current) {
      trRef.current.nodes([]);
    }
  }, [selectedId]);

  const handleExport = () => {
    if (!stageRef.current) return '';
    return stageRef.current.toDataURL({ pixelRatio: 4 });
  };

  useEffect(() => {
    if (id === "placa") {
      (window as any).getCanvasData = handleExport;
    }
  }, [id]);

  // Price formatting logic
  const renderPrice = (slot: 1 | 2 | 3, el: any, key: string) => {
    if (slot === 3 && !productImage3.visible) return null;
    const priceStr = (el.text || '0,00').trim();
    
    // Improved regex to handle thousands separators and different formats
    // Matches: "R$ 1.250,00", "1250.00", "1,250.00", "10", etc.
    const cleanPrice = priceStr.replace(/[^\d,.]/g, '');
    const parts = cleanPrice.split(/[,.]/);
    
    let mainValue = '0';
    let cents = '00';
    
    if (parts.length > 1) {
      cents = parts.pop() || '00';
      mainValue = parts.join('');
    } else {
      mainValue = parts[0] || '0';
    }
    
    // Fallback if parsing fails
    if (!mainValue) mainValue = '0';
    if (cents.length === 1) cents += '0';
    if (cents.length > 2) cents = cents.substring(0, 2);
    
    const isSelected = selectedId === `text-${slot}-price`;

    return (
      <Group 
        key={key}
        id={`text-${slot}-price`}
        x={el.x} 
        y={el.y} 
        draggable 
        onClick={() => setSelectedId(`text-${slot}-price`)}
        onTap={() => setSelectedId(`text-${slot}-price`)}
        onDragEnd={(e) => setElement(slot, 'price', { x: e.target.x(), y: e.target.y() })}
        onTransformEnd={(e) => {
          const node = e.target;
          const scaleX = node.scaleX();
          node.scaleX(1);
          node.scaleY(1);
          setElement(slot, 'price', {
            x: node.x(),
            y: node.y(),
            fontSize: Math.max(10, el.fontSize * scaleX),
          });
        }}
      >
        {/* R$: Label - Small and aligned with the main price */}
        <Text
          text="R$:"
          fontSize={el.fontSize * 0.25}
          fill={el.color}
          fontStyle="bold"
          fontFamily="Inter"
          y={el.fontSize * 0.5}
        />
        
        {/* Main Value and Cents - Large and bold */}
        <Text
          text={`${mainValue},${cents}`}
          x={el.fontSize * 0.45}
          fontSize={el.fontSize}
          fill={el.color}
          fontStyle="bold"
          fontFamily="Inter"
          letterSpacing={-2}
        />

        {/* cada text - positioned further down and right */}
        <Text
          text="cada"
          x={el.fontSize * 0.6 + (mainValue.length + cents.length + 1) * el.fontSize * 0.45}
          y={el.fontSize * 0.95}
          fontSize={el.fontSize * 0.18}
          fill={el.color}
          fontStyle="bold"
          fontFamily="Inter"
        />
      </Group>
    );
  };

  const renderProduct = (slot: 1 | 2 | 3) => {
    if (slot === 3 && !productImage3.visible) return null;
    const textElements = slot === 1 ? textElements1 : slot === 2 ? textElements2 : textElements3;
    const productImage = slot === 1 ? productImage1 : slot === 2 ? productImage2 : productImage3;
    const prodImg = slot === 1 ? prodImg1 : slot === 2 ? prodImg2 : prodImg3;
    const imgRef = slot === 1 ? productImg1Ref : slot === 2 ? productImg2Ref : productImg3Ref;

    return (
      <Group key={`product-slot-${slot}`}>
        {/* Product Image */}
        {prodImg && productImage.visible && (
          <KonvaImage
            key={`prod-img-${slot}`}
            id={`product${slot}`}
            ref={imgRef}
            image={prodImg}
            x={productImage.x}
            y={productImage.y}
            width={productImage.width}
            height={productImage.height}
            rotation={productImage.rotation}
            opacity={productImage.opacity}
            draggable={!productImage.locked}
            onClick={() => setSelectedId(`product${slot}`)}
            onTap={() => setSelectedId(`product${slot}`)}
            onDragEnd={(e) => {
              setProductImage(slot, { x: e.target.x(), y: e.target.y() });
            }}
            onTransformEnd={(e) => {
              const node = imgRef.current;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              setProductImage(slot, {
                x: node.x(),
                y: node.y(),
                width: Math.max(5, node.width() * scaleX),
                height: Math.max(5, node.height() * scaleY),
                rotation: node.rotation(),
              });
            }}
          />
        )}

        {/* Text Elements */}
        {(Object.keys(textElements) as Array<keyof typeof textElements>).map((key) => {
          const el = textElements[key];
          if (!el.visible) return null;
          
          if (key === 'price') return renderPrice(slot, el, `${slot}-${key}`);

          const isSelected = selectedId === `text-${slot}-${key}`;

          return (
            <Group key={`${slot}-${key}`}>
              {/* Visual box like Excel when selected - Hidden when printing */}
              {isSelected && !isPrinting && (
                <Rect
                  x={el.x - 5}
                  y={el.y - 5}
                  width={el.width + 10}
                  height={el.fontSize * 1.5} // Approximate height
                  stroke="#3b82f6"
                  strokeWidth={1}
                  dash={[5, 5]}
                />
              )}
              <Text
                id={`text-${slot}-${key}`}
                text={el.text}
                x={el.x}
                y={el.y}
                fontSize={el.fontSize}
                fill={el.color}
                fontStyle={el.isBold ? 'bold' : 'normal'}
                fontFamily="Inter"
                align={el.align}
                width={el.width || 700}
                lineHeight={1.2}
                draggable
                wrap="word"
                onClick={() => setSelectedId(`text-${slot}-${key}`)}
                onTap={() => setSelectedId(`text-${slot}-${key}`)}
                onDragEnd={(e) => {
                  setElement(slot, key, { x: e.target.x(), y: e.target.y() });
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  const scaleX = node.scaleX();
                  node.scaleX(1);
                  node.scaleY(1);
                  setElement(slot, key, {
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(5, node.width() * scaleX),
                  });
                }}
              />
            </Group>
          );
        })}
      </Group>
    );
  };

  return (
    <div ref={containerRef} className="relative flex flex-col justify-center items-center bg-zinc-100 dark:bg-zinc-900 overflow-hidden h-full max-h-full">
      {/* Zoom Controls */}
      {!isPrinting && (
        <div className="absolute bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-zinc-800 p-2 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-700 no-print">
          <button 
            onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
          >
            -
          </button>
          <input 
            type="range" 
            min="0.1" 
            max="3" 
            step="0.1" 
            value={zoom} 
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24 accent-blue-500"
          />
          <button 
            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
          >
            +
          </button>
          <span className="text-xs font-medium text-zinc-500 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={() => setZoom(1)}
            className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-zinc-100 dark:bg-zinc-700 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600"
          >
            Reset
          </button>
        </div>
      )}

      <div className={`flex-1 w-full overflow-auto flex items-center justify-center ${isPrinting ? 'p-0 m-0 bg-white' : 'p-8'}`}>
        <div 
          id={id}
          className={`bg-white ${isPrinting ? 'shadow-none' : 'shadow-2xl transition-transform duration-300 ease-out'}`}
          style={{ 
            width: A4_WIDTH, 
            height: A4_HEIGHT,
            transform: isPrinting ? 'none' : `scale(${autoScale * zoom})`,
            transformOrigin: 'center center'
          }}
        >
        <Stage
          width={A4_WIDTH}
          height={A4_HEIGHT}
          ref={stageRef}
          pixelRatio={4}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) {
              setSelectedId(null);
              return;
            }
          }}
        >
          <Layer>
            {/* Background */}
            {bgImg && (
              <KonvaImage
                image={bgImg}
                width={A4_WIDTH}
                height={A4_HEIGHT}
                onMouseDown={() => setSelectedId(null)}
              />
            )}

            {renderProduct(1)}
            {renderProduct(2)}
            {renderProduct(3)}

            {selectedId && !isPrinting && (
              <Transformer
                ref={trRef}
                enabledAnchors={
                  selectedId.includes('price') || selectedId.startsWith('product')
                    ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                    : ['middle-left', 'middle-right']
                }
                rotateEnabled={!selectedId.includes('price')}
                boundBoxFunc={(oldBox, newBox) => {
                  if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  </div>
  );
};

export default CanvasPreview;
