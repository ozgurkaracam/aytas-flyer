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
import {
  FLYER_TABLE,
  IMAGE_BUCKET,
  isSupabaseConfigured,
  supabase,
} from "./lib/supabaseClient";
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
  imagePath?: string | null;
  position: number;
};

type Product = ProductInput & { id: string };

type ProductRow = {
  id: string;
  name: string;
  desc: string;
  weight_value: string;
  weight_unit: string;
  price_main: string;
  price_cents: string;
  theme: ThemeOption;
  color: ColorOption;
  image_url: string | null;
  image_path: string | null;
  position: number | null;
};

const mapRowToProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  desc: row.desc,
  weightValue: row.weight_value,
  weightUnit: row.weight_unit,
  priceMain: row.price_main,
  priceCents: row.price_cents,
  theme: row.theme,
  color: row.color,
  image: row.image_url || DEFAULT_PRODUCT_IMAGE,
  imagePath: row.image_path,
  position:
    typeof row.position === "number" && !Number.isNaN(row.position)
      ? row.position
      : 0,
});

const productToRow = (product: Product) => ({
  name: product.name,
  desc: product.desc,
  weight_value: product.weightValue,
  weight_unit: product.weightUnit,
  price_main: product.priceMain,
  price_cents: product.priceCents,
  theme: product.theme,
  color: product.color,
  image_url: product.image,
  image_path: product.imagePath ?? null,
  position: product.position ?? 0,
});

const productToInsertRow = (product: Product) => ({
  id: product.id,
  ...productToRow(product),
});

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

const baseProducts: ProductInput[] = [];

// const baseProducts: ProductInput[] = [
//   {
//     name: "Çaykur",
//     desc: "Rize Çayı",
//     weightValue: "500",
//     weightUnit: "gr",
//     priceMain: "2",
//     priceCents: "99",
//     theme: "theme-yellow",
//     color: "color-gold",
//     image: DEFAULT_PRODUCT_IMAGE,
//     imagePath: null,
//     position: 0,
//   },
//   {
//     name: "Mahmut",
//     desc: "Basmati Pirinç",
//     weightValue: "5",
//     weightUnit: "kg",
//     priceMain: "9",
//     priceCents: "99",
//     theme: "theme-red",
//     color: "color-red",
//     image: DEFAULT_PRODUCT_IMAGE,
//     imagePath: null,
//     position: 1,
//   },
//   {
//     name: "Eker",
//     desc: "Kaşar Peyniri",
//     weightValue: "200",
//     weightUnit: "gr",
//     priceMain: "2",
//     priceCents: "49",
//     theme: "theme-pink",
//     color: "color-red",
//     image: DEFAULT_PRODUCT_IMAGE,
//     imagePath: null,
//     position: 2,
//   },
//   {
//     name: "Koç",
//     desc: "Parmak Sucuk",
//     weightValue: "450",
//     weightUnit: "gr",
//     priceMain: "5",
//     priceCents: "49",
//     theme: "theme-green",
//     color: "color-green",
//     image: DEFAULT_PRODUCT_IMAGE,
//     imagePath: null,
//     position: 3,
//   },
//   {
//     name: "Efe Paşa",
//     desc: "Dilimli Salam",
//     weightValue: "200",
//     weightUnit: "gr",
//     priceMain: "1",
//     priceCents: "89",
//     theme: "theme-orange",
//     color: "color-dark",
//     image: DEFAULT_PRODUCT_IMAGE,
//     imagePath: null,
//     position: 4,
//   },
// ];

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
  imagePath: null,
  position: 0,
};

const buildInitialProducts = (count: number): Product[] =>
  Array.from({ length: count }, (_, index) => {
    const base = baseProducts[index % baseProducts.length];
    return { ...base, id: createId(), position: index };
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
  const [isFetchingProducts, setIsFetchingProducts] =
    useState(isSupabaseConfigured);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const productCount = products.length;
  const saveQueueRef = useRef<Record<string, number>>({});

  const persistProduct = useCallback(
    async (product: Product) => {
      if (!supabase) return;
      const { error } = await supabase
        .from(FLYER_TABLE)
        .update(productToRow(product))
        .eq("id", product.id);
      if (error) {
        console.error("Ürün güncellenemedi", error);
      }
    },
    [FLYER_TABLE, supabase]
  );

  const queueProductSave = useCallback(
    (product: Product) => {
      if (!supabase) return;
      const pending = saveQueueRef.current[product.id];
      if (pending) {
        window.clearTimeout(pending);
      }
      saveQueueRef.current[product.id] = window.setTimeout(() => {
        delete saveQueueRef.current[product.id];
        void persistProduct(product);
      }, 450);
    },
    [persistProduct, supabase]
  );

  const applyProductPatch = useCallback(
    (patch: Partial<ProductInput>) => {
      setFormData((prev) => ({ ...prev, ...patch }));
      setProducts((prev) => {
        if (!prev[selectedIndex]) return prev;
        const next = [...prev];
        const updated = { ...next[selectedIndex], ...patch };
        next[selectedIndex] = updated;
        if (supabase) {
          queueProductSave(updated);
        }
        return next;
      });
    },
    [queueProductSave, selectedIndex, supabase]
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

  useEffect(() => {
    if (!supabase) {
      setIsFetchingProducts(false);
      return;
    }

    const client = supabase;
    let isMounted = true;

    const loadProducts = async () => {
      setIsFetchingProducts(true);
      const { data, error } = await client
        .from(FLYER_TABLE)
        .select("*")
        .order("position", { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error("Ürünler getirilirken hata oluştu", error);
        setIsFetchingProducts(false);
        return;
      }

      if (!data || data.length === 0) {
        const defaults = buildInitialProducts(INITIAL_PRODUCT_COUNT);
        setProducts(defaults);
        setSelectedIndex(0);
        try {
          await client
            .from(FLYER_TABLE)
            .insert(defaults.map((product) => productToInsertRow(product)));
        } catch (seedError) {
          console.error(
            "Varsayılan ürünler kaydedilirken hata oluştu",
            seedError
          );
        } finally {
          if (isMounted) {
            setIsFetchingProducts(false);
          }
        }
        return;
      }

      const mapped = data
        .map(mapRowToProduct)
        .sort((a, b) => a.position - b.position);
      setProducts(mapped);
      setSelectedIndex((prev) =>
        mapped.length === 0 ? 0 : Math.min(prev, mapped.length - 1)
      );
      setIsFetchingProducts(false);
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

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
    return () => {
      Object.values(saveQueueRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
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

  const previewStageStyle = useMemo(
    () => ({
      width: `${PREVIEW_BASE_SIZE * previewScale}px`,
      height: `${PREVIEW_BASE_SIZE * previewScale}px`,
    }),
    [previewScale]
  );

  const frameScale = isDownloading ? 1 : previewScale;

  const previewFrameStyle = useMemo(
    () => ({
      transform: `scale(${frameScale})`,
      transformOrigin: "top left",
      width: `${PREVIEW_BASE_SIZE}px`,
      height: `${PREVIEW_BASE_SIZE}px`,
    }),
    [frameScale]
  );

  const handleHeaderImageLoad = () => computeGridMetrics();

  const handleFieldChange =
    <T extends keyof ProductInput>(field: T) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const { value } = event.target;
      applyProductPatch({ [field]: value } as Pick<ProductInput, T>);
    };

  const handleImageFile = useCallback(
    async (file?: File | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      setIsUploadingImage(true);

      if (!supabase) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            applyProductPatch({ image: reader.result, imagePath: null });
          }
          setIsUploadingImage(false);
        };
        reader.onerror = () => setIsUploadingImage(false);
        reader.readAsDataURL(file);
        return;
      }

      try {
        const extension = file.name.split(".").pop() ?? "png";
        const storagePath = `products/${createId()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(storagePath, file, {
            upsert: false,
            cacheControl: "3600",
          });
        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath);

        const previousPath = products[selectedIndex]?.imagePath;

        applyProductPatch({ image: publicUrl, imagePath: storagePath });

        if (previousPath && previousPath !== storagePath) {
          await supabase.storage.from(IMAGE_BUCKET).remove([previousPath]);
        }
      } catch (error) {
        console.error("Görsel yüklenirken hata oluştu", error);
      } finally {
        setIsUploadingImage(false);
      }
    },
    [IMAGE_BUCKET, applyProductPatch, products, selectedIndex, supabase]
  );

  const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    void handleImageFile(file);
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
    void handleImageFile(file);
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

  const handleAddProduct = useCallback(async () => {
    const newProduct: Product = {
      ...formData,
      id: createId(),
      image: formData.image || DEFAULT_PRODUCT_IMAGE,
      imagePath: formData.imagePath ?? null,
      position: productCount,
    };

    setProducts((prev) => [...prev, newProduct]);
    setSelectedIndex(productCount);
    setFormData(newProduct);

    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from(FLYER_TABLE)
        .insert([productToInsertRow(newProduct)])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const persisted = mapRowToProduct(data);
        setProducts((prev) =>
          prev.map((product) =>
            product.id === newProduct.id ? persisted : product
          )
        );
        setFormData(persisted);
      }
    } catch (error) {
      console.error("Yeni ürün eklenemedi", error);
    }
  }, [formData, productCount, supabase]);

  const handleDeleteProduct = useCallback(async () => {
    const target = products[selectedIndex];
    if (!target) return;

    const nextIndex = Math.max(0, Math.min(selectedIndex, products.length - 2));
    setProducts((prev) => prev.filter((_, index) => index !== selectedIndex));
    setSelectedIndex(nextIndex);

    if (!supabase) return;

    try {
      const deletePromise = supabase
        .from(FLYER_TABLE)
        .delete()
        .eq("id", target.id);
      const removeImagePromise =
        target.imagePath && target.imagePath.length > 0
          ? supabase.storage.from(IMAGE_BUCKET).remove([target.imagePath])
          : Promise.resolve({ error: null });

      const [{ error: deleteError }, { error: imageError } = { error: null }] =
        await Promise.all([deletePromise, removeImagePromise]);

      if (deleteError) {
        console.error("Ürün silinirken hata oluştu", deleteError);
      }
      if (imageError) {
        console.error("Görsel silinirken hata oluştu", imageError);
      }
    } catch (error) {
      console.error("Ürün silinemedi", error);
    }
  }, [IMAGE_BUCKET, products, selectedIndex, supabase]);

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
                {isUploadingImage && (
                  <div className="image-dropzone__loader">
                    <span>Yükleniyor…</span>
                  </div>
                )}
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
                onClick={() => void handleAddProduct()}
              >
                Yeni Ürün Ekle
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => void handleDeleteProduct()}
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
              {isFetchingProducts && isSupabaseConfigured && (
                <p className="sync-hint">Supabase verileri yükleniyor…</p>
              )}
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
