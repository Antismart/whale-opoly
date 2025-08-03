mod systems {
    mod game_manager;
    mod board_actions;
    mod property_management;
    mod treasury;
    mod random_engine;
    // Temporarily disabled advanced systems due to Cairo compatibility issues
    // These need significant refactoring for Cairo 2.10.1
    // mod security;
    // mod economics;
    // mod market_events;
}

mod models;

mod tests {
    mod test_game_manager;
    mod test_board_actions;
    mod test_security;
    mod test_economics;
    mod test_market_events;
}
