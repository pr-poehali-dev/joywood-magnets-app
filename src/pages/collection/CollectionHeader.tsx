const CollectionHeader = () => (
  <div className="text-center space-y-3">
    <img
      src="https://cdn.poehali.dev/projects/d4862cdc-db07-4efa-aa4f-e8229141eeb3/bucket/1a067cd5-eb6a-42be-8edd-d1ca100bf90c.jpg"
      alt="Joywood"
      className="w-20 h-20 mx-auto object-contain"
    />
    <div className="space-y-1.5">
      <h1 className="text-2xl font-bold text-foreground">Ваша коллекция уже началась</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        В ваших руках — образец настоящей ценной породы дерева. Joywood работает с более чем 50 породами, и каждая следующая покупка приближает вас к редким экземплярам и подаркам
      </p>
    </div>
  </div>
);

export default CollectionHeader;
