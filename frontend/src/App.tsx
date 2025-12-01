import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, CSSProperties, DragEvent } from "react";
import { toPng } from "html-to-image";
import "./App.css";

type ThemeOption =
  | "theme-yellow"
  | "theme-red"
  | "theme-pink"
  | "theme-green"
  | "theme-orange"
  | "theme-blue";

type ColorOption =
  | "color-gold"
  | "color-red"
  | "color-green"
  | "color-dark"
  | "color-blue";

type ProductInput = {
  name: string;
  desc: string;
  weightValue: string;
  weightUnit: string;
  priceMain: string;
  priceCents: string;
  theme: ThemeOption;
  color: ColorOption;
  image: string;
};

type Product = ProductInput & { id: string };

const HEADER_IMAGE = "/headermarket.png";
const DEFAULT_PRODUCT_IMAGE = "/kasar.png";
const INITIAL_PRODUCT_COUNT = 7;

const THEME_OPTIONS: { label: string; value: ThemeOption }[] = [
  { label: "Sarı", value: "theme-yellow" },
  { label: "Kırmızı", value: "theme-red" },
  { label: "Pembe", value: "theme-pink" },
  { label: "Yeşil", value: "theme-green" },
  { label: "Turuncu", value: "theme-orange" },
  { label: "Mavi", value: "theme-blue" },
];

const COLOR_OPTIONS: { label: string; value: ColorOption }[] = [
  { label: "Altın", value: "color-gold" },
  { label: "Kırmızı", value: "color-red" },
  { label: "Yeşil", value: "color-green" },
  { label: "Koyu", value: "color-dark" },
  { label: "Mavi", value: "color-blue" },
];

const baseProducts: ProductInput[] = [
  {
    name: "Çaykur",
    desc: "Rize Çayı",
    weightValue: "500",
    weightUnit: "gr",
    priceMain: "2",
    priceCents: "99",
    theme: "theme-yellow",
    color: "color-gold",
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    name: "Mahmut",
    desc: "Basmati Pirinç",
    weightValue: "5",
    weightUnit: "kg",
    priceMain: "9",
    priceCents: "99",
    theme: "theme-red",
    color: "color-red",
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    name: "Eker",
    desc: "Kaşar Peyniri",
    weightValue: "200",
    weightUnit: "gr",
    priceMain: "2",
    priceCents: "49",
    theme: "theme-pink",
    color: "color-red",
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    name: "Koç",
    desc: "Parmak Sucuk",
    weightValue: "450",
    weightUnit: "gr",
    priceMain: "5",
    priceCents: "49",
    theme: "theme-green",
    color: "color-green",
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    name: "Efe Paşa",
    desc: "Dilimli Salam",
    weightValue: "200",
    weightUnit: "gr",
    priceMain: "1",
    priceCents: "89",
    theme: "theme-orange",
    color: "color-dark",
    image: DEFAULT_PRODUCT_IMAGE,
  },
];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyProduct: ProductInput = {
  name: "",
  desc: "",
  weightValue: "",
  weightUnit: "gr",
  priceMain: "",
  priceCents: "",
  theme: "theme-yellow",
  color: "color-gold",
  image: DEFAULT_PRODUCT_IMAGE,
};

const buildInitialProducts = (count: number): Product[] =>
  Array.from({ length: count }, (_, index) => {
    const base = baseProducts[index % baseProducts.length];
    return { ...base, id: createId() };
  });

type Metrics = {
  padding: number;
  gap: number;
  rowHeight: number;
  baseSize: number;
  columns: number;
};

type GridStyle = CSSProperties & {
  "--grid-padding": string;
  "--grid-row-height": string;
  "--grid-gap": string;
  "--grid-columns": string;
  "--base-size": string;
};

const PREVIEW_BASE_SIZE = 1200;

function App() {
  const [products, setProducts] = useState<Product[]>(() =>
    buildInitialProducts(INITIAL_PRODUCT_COUNT)
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [formData, setFormData] = useState<ProductInput>(
    products[0] ?? emptyProduct
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);

  const [gridMetrics, setGridMetrics] = useState<Metrics>({
    padding: 30,
    gap: 20,
    rowHeight: 220,
    baseSize: 18,
    columns: 5,
  });
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  const productCount = products.length;

  const updateProductField = useCallback(
    (field: keyof ProductInput, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setProducts((prev) => {
        if (!prev[selectedIndex]) return prev;
        const next = [...prev];
        next[selectedIndex] = { ...next[selectedIndex], [field]: value };
        return next;
      });
    },
    [selectedIndex]
  );

  useEffect(() => {
    const selected = products[selectedIndex];
    if (selected) {
      const { id, ...rest } = selected;
      setFormData(rest);
    } else {
      setFormData(emptyProduct);
    }
  }, [products, selectedIndex]);

  const computeGridMetrics = useCallback(() => {
    const totalHeight = containerRef.current?.offsetHeight ?? 1200;
    const headerHeight = headerRef.current?.offsetHeight ?? 250;
    const totalItems = Math.max(productCount, 1);
    const idealColumns = Math.ceil(Math.sqrt(totalItems));
    const columns = Math.max(1, Math.min(5, idealColumns));
    const rows = Math.max(1, Math.ceil(totalItems / columns));

    let padding = 30;
    let gap = 20;

    if (rows > 6) {
      padding = 20;
      gap = 15;
    }

    if (rows > 9) {
      padding = 10;
      gap = 5;
    }

    const availableHeight = totalHeight - headerHeight - padding * 2;
    const safeAvailable = Math.max(200, availableHeight);
    const totalGapSpace = gap * (rows - 1);
    let cellHeight = (safeAvailable - totalGapSpace) / rows;

    if (!Number.isFinite(cellHeight) || cellHeight <= 0) {
      cellHeight = safeAvailable / rows;
    }

    if (cellHeight > 280) cellHeight = 280;

    let baseSize = cellHeight / 11;
    if (cellHeight < 90) baseSize = cellHeight / 9;

    setGridMetrics({
      padding,
      gap,
      rowHeight: cellHeight,
      baseSize,
      columns,
    });
  }, [productCount]);

  useLayoutEffect(() => {
    computeGridMetrics();
  }, [computeGridMetrics]);

  useLayoutEffect(() => {
    const wrapper = previewWrapperRef.current;
    if (!wrapper) return undefined;

    const updateScale = () => {
      const width = wrapper.clientWidth || 1200;
      const scale = Math.min(1, Math.max(width / 1200, 0.4));
      setPreviewScale(scale);
    };

    updateScale();

    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => updateScale());
      resizeObserver.observe(wrapper);
    } else {
      window.addEventListener("resize", updateScale);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", updateScale);
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => computeGridMetrics();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [computeGridMetrics]);

  const gridStyle = useMemo<GridStyle>(
    () => ({
      "--grid-padding": `${gridMetrics.padding}px`,
      "--grid-row-height": `${gridMetrics.rowHeight}px`,
      "--grid-gap": `${gridMetrics.gap}px`,
      "--grid-columns": `${gridMetrics.columns}`,
      "--base-size": `${gridMetrics.baseSize}px`,
      padding: `${gridMetrics.padding}px`,
      gap: `${gridMetrics.gap}px`,
      gridTemplateColumns: `repeat(${gridMetrics.columns}, minmax(0, 1fr))`,
      gridAutoRows: `${gridMetrics.rowHeight}px`,
    }),
    [gridMetrics]
  );

  const effectiveScale = isDownloading ? 1 : previewScale;

  const previewStageStyle = useMemo(
    () => ({
      width: `${PREVIEW_BASE_SIZE * effectiveScale}px`,
      height: `${PREVIEW_BASE_SIZE * effectiveScale}px`,
    }),
    [effectiveScale]
  );

  const previewFrameStyle = useMemo(
    () => ({
      transform: `scale(${effectiveScale})`,
      transformOrigin: "top left",
      width: `${PREVIEW_BASE_SIZE}px`,
      height: `${PREVIEW_BASE_SIZE}px`,
    }),
    [effectiveScale]
  );

  const handleHeaderImageLoad = () => computeGridMetrics();

  const handleFieldChange =
    (field: keyof ProductInput) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const { value } = event.target;
      updateProductField(field, value);
    };

  const handleImageFile = useCallback(
    (file?: File | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          updateProductField("image", reader.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [updateProductField]
  );

  const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleImageFile(file);
    event.target.value = "";
  };

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    handleImageFile(file);
  };

  const waitForFrames = (count = 1) =>
    new Promise<void>((resolve) => {
      const step = (remaining: number) => {
        if (remaining <= 0) {
          resolve();
          return;
        }
        requestAnimationFrame(() => step(remaining - 1));
      };
      step(count);
    });

  const handleDownloadPreview = async () => {
    if (!containerRef.current || isDownloading) return;
    try {
      setIsDownloading(true);
      await waitForFrames(2);
      const dataUrl = await toPng(containerRef.current, {
        cacheBust: true,
        width: PREVIEW_BASE_SIZE,
        height: PREVIEW_BASE_SIZE,
        pixelRatio: 1,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `aytas-flyer-${timestamp}.png`;
      link.click();
    } catch (error) {
      console.error("Önizleme indirilemedi", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddProduct = () => {
    const payload: ProductInput = {
      ...formData,
      image: formData.image || DEFAULT_PRODUCT_IMAGE,
    };

    setProducts((prev) => [...prev, { ...payload, id: createId() }]);
    setSelectedIndex(productCount);
  };

  const handleDeleteProduct = () => {
    setProducts((prev) => {
      if (!prev[selectedIndex]) {
        return prev;
      }
      const nextProducts = prev.filter((_, index) => index !== selectedIndex);
      const nextIndex = Math.max(
        0,
        Math.min(selectedIndex, nextProducts.length - 1)
      );
      setSelectedIndex(nextIndex);
      return nextProducts;
    });
  };

  const handleSelectProduct = (index: number) => {
    setSelectedIndex(index);
  };

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div>
          <p className="eyebrow">Aytas Flyer</p>
          <h1>Ürün Panosu</h1>
          <p className="subtitle">
            Soldaki form ile kartları düzenleyin, sağda canlı önizlemeyi görün.
          </p>
        </div>
        <div className="summary-chip">
          <span>Ürün Sayısı</span>
          <strong>{productCount}</strong>
        </div>
      </div>

      <div className="dashboard__content">
        <section className="panel panel--form">
          <header>
            <h2>Ürün Formu</h2>
            <p>
              Listeye eklemek veya var olan ürünü güncellemek için doldurun.
            </p>
          </header>

          <div className="product-list">
            {products.map((product, index) => (
              <button
                key={product.id}
                type="button"
                className={`product-pill ${
                  index === selectedIndex ? "product-pill--active" : ""
                }`}
                onClick={() => handleSelectProduct(index)}
              >
                {product.name || `Ürün ${index + 1}`}
              </button>
            ))}
          </div>

          <form
            className="product-form"
            onSubmit={(event) => event.preventDefault()}
          >
            <label>
              Marka Adı
              <input
                type="text"
                value={formData.name}
                onChange={handleFieldChange("name")}
                placeholder="Örn: Çaykur"
                required
              />
            </label>

            <label>
              Ürün Açıklaması
              <input
                type="text"
                value={formData.desc}
                onChange={handleFieldChange("desc")}
                placeholder="Örn: Rize Çayı"
                required
              />
            </label>

            <div className="field-row">
              <label>
                Ağırlık
                <input
                  type="text"
                  value={formData.weightValue}
                  onChange={handleFieldChange("weightValue")}
                  placeholder="500"
                  required
                />
              </label>
              <label>
                Birim
                <select
                  value={formData.weightUnit}
                  onChange={handleFieldChange("weightUnit")}
                >
                  <option value="gr">gr</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="lt">lt</option>
                </select>
              </label>
            </div>

            <div className="field-row">
              <label>
                Fiyat (€)
                <input
                  type="text"
                  value={formData.priceMain}
                  onChange={handleFieldChange("priceMain")}
                  placeholder="2"
                  required
                />
              </label>
              <label>
                Fiyat (Cent)
                <input
                  type="text"
                  value={formData.priceCents}
                  onChange={handleFieldChange("priceCents")}
                  placeholder="99"
                  maxLength={2}
                  required
                />
              </label>
            </div>

            <div className="field-row">
              <label>
                Tema
                <select
                  value={formData.theme}
                  onChange={handleFieldChange("theme")}
                >
                  {THEME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Yazı Rengi
                <select
                  value={formData.color}
                  onChange={handleFieldChange("color")}
                >
                  {COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="image-field">
              Ürün Görseli
              <div
                className={`image-dropzone ${
                  isDragActive ? "image-dropzone--active" : ""
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleDropzoneClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="image-dropzone__input"
                  onChange={handleImageInputChange}
                />
                <div className="image-dropzone__text">
                  <strong>Dosya seç veya sürükleyip bırak</strong>
                  <span>PNG, JPG veya WEBP</span>
                </div>
                {formData.image && (
                  <div className="image-preview">
                    <img
                      src={formData.image}
                      alt={formData.name || "Ürün görseli"}
                    />
                  </div>
                )}
              </div>
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={handleAddProduct}
              >
                Yeni Ürün Ekle
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleDeleteProduct}
                disabled={!products[selectedIndex]}
              >
                Ürünü Sil
              </button>
            </div>
          </form>
        </section>

        <section className="panel panel--preview">
          <header className="preview-header">
            <div>
              <h2>Canlı Önizleme</h2>
              <p>Aytas Supermarkt</p>
            </div>
            <button
              type="button"
              className="btn primary download-btn"
              onClick={handleDownloadPreview}
              disabled={isDownloading}
            >
              {isDownloading ? "Hazırlanıyor..." : "PNG İndir"}
            </button>
          </header>
          <div className="preview-wrapper" ref={previewWrapperRef}>
            <div className="preview-stage" style={previewStageStyle}>
              <div
                className="preview-frame"
                ref={containerRef}
                style={previewFrameStyle}
              >
                <div className="header" ref={headerRef}>
                  <img
                    src={HEADER_IMAGE}
                    alt="Header"
                    onLoad={handleHeaderImageLoad}
                  />
                </div>
                <div
                  className="products-grid"
                  id="react-grid"
                  ref={gridRef}
                  style={gridStyle}
                >
                  {products.map((product, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <div
                        key={product.id}
                        className={`product-card ${product.theme} ${
                          isSelected && !isDownloading
                            ? "product-card--active"
                            : ""
                        }`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectProduct(index)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleSelectProduct(index);
                          }
                        }}
                        aria-pressed={isSelected}
                        aria-label={`${product.name} düzenle`}
                      >
                        {isSelected && !isDownloading && (
                          <span className="edit-indicator">Düzenleniyor</span>
                        )}
                        <div className="paint-layer"></div>
                        <div className="img-container">
                          <img
                            src={product.image || DEFAULT_PRODUCT_IMAGE}
                            className="prod-img"
                            alt={product.name || "Ürün görseli"}
                            onLoad={handleHeaderImageLoad}
                          />
                        </div>
                        <div className="badge-weight">
                          <span className="bw-val">{product.weightValue}</span>
                          <span className="bw-unit">{product.weightUnit}</span>
                        </div>
                        <div className="badge-price">
                          <div className="price-wrap">
                            <span className="cur">€</span>
                            <span className="p-main">{product.priceMain}</span>
                            <span className="p-cent">
                              ,{product.priceCents}
                            </span>
                          </div>
                        </div>
                        <div className={`text-container ${product.color}`}>
                          <span className="brand-name">{product.name}</span>
                          <span className="prod-desc">{product.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
