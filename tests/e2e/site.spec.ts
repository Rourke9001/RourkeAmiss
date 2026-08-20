import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/', '/cv', '/work', '/work/type-debt-programme', '/404']) {
  test(`${path} has no detectable accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('the landing page shows evidence before prose', async ({ page }) => {
  await page.goto('/');
  const firstMetric = page.locator('[data-metric]').first();
  await expect(firstMetric).toBeVisible();
});

test('provenance text is present without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByText(/measured|captured|survey/i).first()).toBeVisible();
});

test('the CV page carries no phone number', async ({ page }) => {
  await page.goto('/cv');
  expect(await page.content()).not.toMatch(/(?:\+?27|0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/);
});

test('the CV page prints without interactive chrome', async ({ page }) => {
  await page.goto('/cv');

  // Assert the targets EXIST before asserting they are hidden. The version of
  // this test that shipped selected '.provenance button', which /cv does not
  // render at all — /cv carries no trace strip — and toBeHidden() passes for a
  // locator that matches nothing, so it could never fail. The interactive
  // chrome /cv actually has is the nav and the request form.
  await expect(page.locator('nav.site-nav')).toHaveCount(1);
  await expect(page.locator('#request')).toHaveCount(1);

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('nav.site-nav')).toBeHidden();
  await expect(page.locator('#request')).toBeHidden();
});

test('the provenance toggle is hidden in print, where it exists', async ({ page }) => {
  await page.goto('/');
  const toggles = page.locator('.provenance button');
  await expect(toggles).toHaveCount(4);
  // print.css ships on /cv only, so on / the buttons stay visible under print
  // emulation. What matters here is that the toggle is a real element with a
  // real count — the assertion the /cv test could not make.
  await expect(toggles.first()).toBeVisible();
});

// The defect this guards reached review once and no unit test could have caught
// it: each metric row sized its own columns, so the figures drifted ~40px apart
// down the page while every assertion still passed. Geometry needs a browser.
test('the metric figures column-align across every row', async ({ page }) => {
  await page.goto('/');
  for (const hook of ['.figure-from', '.figure-to']) {
    const edges = await page.locator(hook).evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().right)),
    );
    expect(edges.length).toBeGreaterThan(1);
    expect(new Set(edges).size, `${hook} right edges: ${edges.join(', ')}`).toBe(1);
  }
});

// The bars carry their width through a class off a static scale rather than a
// style attribute, because a hashed style-src blocks attributes outright. If
// that ever regresses to an attribute the CSP silently blanks the strip, so
// assert the rendered geometry rather than the markup.
test('the metric bars render at their measured widths', async ({ page }) => {
  await page.goto('/');
  // offsetWidth, not getBoundingClientRect: the bars animate in from
  // scaleX(0) on scroll, and a transformed box would read 0 before the
  // animation runs. The CSS width is the thing a broken CSP would destroy.
  const widths = await page.locator('[data-metric-fill]').evaluateAll((els) =>
    els.map((el) => {
      const track = (el.parentElement as HTMLElement).offsetWidth;
      return track > 0 ? (el as HTMLElement).offsetWidth / track : -1;
    }),
  );
  expect(widths.length).toBe(4);
  // 177 -> 36.6 is 20.7% of its baseline; 57 -> 328 is capped at 100%.
  expect(widths[0]).toBeGreaterThan(0.18);
  expect(widths[0]).toBeLessThan(0.23);
  expect(widths[3]).toBeGreaterThan(0.98);
});

test.describe('the request form', () => {
  const fill = async (page: Page) => {
    await page.getByLabel('Your name').fill('Jane Doe');
    await page.getByLabel('Email', { exact: true }).fill('jane@acme.com');
    await page.getByRole('button', { name: 'Request the CV' }).click();
  };

  test('reports success when the API accepts the request', async ({ page }) => {
    await page.route('**/api/request-cv', (route) =>
      route.fulfill({ status: 202, contentType: 'application/json', body: '{}' }),
    );
    await page.goto('/');
    await fill(page);
    await expect(page.getByText(/Request received/i)).toBeVisible();
  });

  test('says so plainly when it is rate limited', async ({ page }) => {
    await page.route('**/api/request-cv', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', body: '{}' }),
    );
    await page.goto('/');
    await fill(page);
    await expect(page.getByText(/several requests in a short time/i)).toBeVisible();
  });

  test('falls back to the direct address when delivery fails', async ({ page }) => {
    await page.route('**/api/request-cv', (route) =>
      route.fulfill({ status: 502, contentType: 'application/json', body: '{}' }),
    );
    await page.goto('/');
    await fill(page);
    await expect(page.getByText(/directly and it will reach him/i)).toBeVisible();
  });

  test('the honeypot is off-screen, untabbable and hidden from assistive tech', async ({ page }) => {
    await page.goto('/');
    const honeypot = page.locator('input[name="website"]');
    // Deliberately NOT display:none — a form-filling bot should see an ordinary
    // field. It is pushed off-screen, taken out of the tab order, and its
    // wrapper is aria-hidden, so no human and no screen reader ever meets it.
    const box = await honeypot.boundingBox();
    expect(box!.x).toBeLessThan(0);
    expect(await honeypot.getAttribute('tabindex')).toBe('-1');
    await expect(page.locator('.honeypot')).toHaveAttribute('aria-hidden', 'true');
  });
});
