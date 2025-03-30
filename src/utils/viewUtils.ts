export async function activateView(app: any, viewType: string, direction: 'left' | 'right') {
	const { workspace } = app;
	
	// 检查视图是否已经打开
	let leaf = null;
	const leaves = workspace.getLeavesOfType(viewType);
		
	if (leaves.length > 0) {
		// 如果视图已经打开，激活它
		leaf = leaves[0];
	} else {
		// 如果视图未打开，创建一个新的
		leaf = direction === 'left'
			? workspace.getLeftLeaf(false)
			: workspace.getRightLeaf(false);
	}
	
	// 添加空值检查
	if (leaf) {
		await leaf.setViewState({
			type: viewType,
			active: true,
		});
		
		// 激活叶子
		workspace.revealLeaf(leaf);
	}
}