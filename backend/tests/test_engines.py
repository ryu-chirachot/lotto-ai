import random

import numpy as np
import pytest

from app.engines import backtester, blender, markov_engine, montecarlo_6d, stats_engine


@pytest.fixture
def uniform_seq() -> list[int]:
    rng = random.Random(7)
    return [rng.randrange(100) for _ in range(500)]


@pytest.fixture
def first_prizes() -> list[str]:
    rng = random.Random(11)
    return [f"{rng.randrange(1_000_000):06d}" for _ in range(300)]


def test_frequency_and_gaps():
    seq = [5, 7, 5, 99]
    counts = stats_engine.frequency(seq)
    assert counts[5] == 2 and counts[7] == 1 and counts[99] == 1 and counts.sum() == 4
    gaps = stats_engine.gaps(seq)
    assert gaps[99] == 0 and gaps[5] == 1 and gaps[7] == 2 and gaps[0] == 4


def test_smoothed_probabilities_sum_to_one():
    p = stats_engine.smoothed_probabilities(stats_engine.frequency([1, 1, 2]))
    assert p.sum() == pytest.approx(1.0)
    assert p.min() > 0


def test_recency_prefers_recent():
    p = stats_engine.recency_weighted([1] * 10 + [2] * 10, half_life=3)
    assert p[2] > p[1] > p[50]
    assert p.sum() == pytest.approx(1.0)


def test_chi_square_uniform_data_not_rejected(uniform_seq):
    result = stats_engine.chi_square_uniformity(stats_engine.frequency(uniform_seq))
    assert result["dof"] == 99
    assert result["p_value"] > 0.01


def test_chi_square_detects_bias():
    biased = [3] * 200 + list(range(100))
    assert stats_engine.chi_square_uniformity(stats_engine.frequency(biased))["p_value"] < 1e-6


def test_hot_cold_ordering():
    seq = [1, 1, 1, 2, 2, 3]
    hc = stats_engine.hot_cold(seq, top_k=3)
    assert [r["number"] for r in hc["hot"]] == [1, 2, 3]
    assert hc["cold"][0]["count"] == 0


def test_positional_frequency(first_prizes):
    counts = stats_engine.positional_frequency(["012345", "012399"])
    assert counts[0, 0] == 2 and counts[4, 4] == 1 and counts[5, 9] == 1
    assert stats_engine.positional_frequency(first_prizes).sum(axis=1).tolist() == [300.0] * 6


def test_transition_matrix_is_row_stochastic(uniform_seq):
    m = markov_engine.transition_matrix(uniform_seq)
    assert m.shape == (100, 100)
    np.testing.assert_allclose(m.sum(axis=1), 1.0)


def test_markov_learns_deterministic_chain():
    seq = [i % 100 for i in range(1000)]  # 0,1,2,...,99,0,1,...
    dist = markov_engine.next_distribution(seq, alpha=0.01)
    assert int(np.argmax(dist)) == (seq[-1] + 1) % 100
    assert dist.sum() == pytest.approx(1.0)


def test_digit_markov_distribution(uniform_seq):
    d = markov_engine.digit_markov_distribution(uniform_seq)
    assert d.shape == (100,) and d.sum() == pytest.approx(1.0)


def test_stationary_of_uniform_chain_is_uniform():
    pi = markov_engine.stationary_distribution(np.full((100, 100), 0.01))
    np.testing.assert_allclose(pi, 0.01)


def test_blend_zero_weights_is_uniform(uniform_seq):
    scores = blender.blend(uniform_seq, {k: 0 for k in blender.COMPONENTS})
    np.testing.assert_allclose(scores, 0.01)


def test_blend_single_component_matches(uniform_seq):
    scores = blender.blend(uniform_seq, {"frequency": 1})
    expected = stats_engine.smoothed_probabilities(stats_engine.frequency(uniform_seq))
    np.testing.assert_allclose(scores, expected)


def test_rank_tie_break():
    assert blender.rank(np.array([0.1, 0.3, 0.3, 0.2]), 3) == [1, 2, 3]


def test_backtest_no_lookahead_and_baseline(uniform_seq):
    result = backtester.backtest(uniform_seq, top_k=10, min_history=50)
    assert result["n_tests"] == 450
    assert result["baseline_rate"] == 0.1
    assert result["series"][-1]["cum_hits"] == result["hits"]
    # Uniform random data: hit rate should be near 10%, never wildly significant
    assert 0.04 < result["hit_rate"] < 0.18
    assert result["p_value"] > 0.001


def test_backtest_finds_real_signal():
    seq = [i % 100 for i in range(400)]
    result = backtester.backtest(seq, {"markov": 1}, top_k=1, min_history=150, markov_alpha=0.01)
    assert result["hit_rate"] == 1.0
    assert result["p_value"] < 1e-10


def test_backtest_roi_accounting():
    seq = [i % 100 for i in range(200)]
    r = backtester.backtest(seq, {"markov": 1}, top_k=2, min_history=150, stake=10, payout=100, markov_alpha=0.01)
    assert r["total_cost"] == 50 * 2 * 10
    assert r["total_return"] == r["hits"] * 100


def test_montecarlo_respects_constraints(first_prizes):
    c = montecarlo_6d.Constraints(sum_min=20, sum_max=30, max_repeat=2, even_min=2, even_max=4, fixed={0: 7}, exclude_digits=[3])
    result = montecarlo_6d.simulate(first_prizes, n_sims=5000, constraints=c, seed=1)
    assert result["accepted"] > 0
    for cand in result["candidates"]:
        digits = [int(ch) for ch in cand["number"]]
        assert digits[0] == 7 and 3 not in digits
        assert 20 <= sum(digits) <= 30
        assert 2 <= sum(d % 2 == 0 for d in digits) <= 4
        assert max(digits.count(d) for d in set(digits)) <= 2


def test_montecarlo_is_seeded(first_prizes):
    a = montecarlo_6d.simulate(first_prizes, n_sims=2000, seed=42)
    b = montecarlo_6d.simulate(first_prizes, n_sims=2000, seed=42)
    assert a["candidates"] == b["candidates"]


def test_montecarlo_rejects_impossible_constraints(first_prizes):
    with pytest.raises(ValueError):
        montecarlo_6d.simulate(first_prizes, constraints=montecarlo_6d.Constraints(exclude_digits=list(range(10))))
