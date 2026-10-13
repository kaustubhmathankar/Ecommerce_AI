import ProductCard from './ProductCard'

function ProductGrid({
    products,
    wishlist,
    onWishlist,
    onAddToCart,
}) {
    if (!products.length) {
        return (
            <div className="col-span-full flex min-h-[260px] items-center justify-center">
                <div className="text-center">
                    <h3 className="text-lg font-medium">
                        No products found
                    </h3>

                    <p className="mt-2 text-sm text-neutral-500">
                        There are no products available right now.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <>
            {products.map((product) => (
                <ProductCard
                    key={product.id}
                    product={product}
                    isWishlisted={wishlist.includes(product.id)}
                    onWishlist={onWishlist}
                    onAddToCart={onAddToCart}
                />
            ))}
        </>
    )
}

export default ProductGrid